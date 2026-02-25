import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const buildRoot = process.cwd();
const repoRoot = resolve(buildRoot, "..");
const runtimeMigrationsDir = join(buildRoot, "db", "migrations");
const canonicalMigrationsDir = join(repoRoot, "database", "migrations");
const reportsDir = join(buildRoot, "reports");

const DB_USER = "taxcore";
const DB_PASSWORD = "taxcore";
const DB_NAME = "taxcore_compat";
const SCHEMAS = ["registration", "obligation", "filing", "assessment", "amendment", "claim", "audit", "auth"];

mkdirSync(reportsDir, { recursive: true });

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function mustRun(cmd, args, options = {}) {
  const result = run(cmd, args, options);
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const message = [`Command failed: ${cmd} ${args.join(" ")}`];
    if (stdout) message.push(`stdout:\n${stdout}`);
    if (stderr) message.push(`stderr:\n${stderr}`);
    throw new Error(message.join("\n"));
  }
  return result;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function createContainer(name) {
  mustRun("docker", [
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "-e",
    `POSTGRES_USER=${DB_USER}`,
    "-e",
    `POSTGRES_PASSWORD=${DB_PASSWORD}`,
    "-e",
    `POSTGRES_DB=${DB_NAME}`,
    "postgres:16",
  ]);
}

function stopContainer(name) {
  run("docker", ["rm", "-f", name]);
}

function waitForPostgres(name) {
  for (let i = 0; i < 80; i += 1) {
    const probe = run("docker", ["exec", name, "pg_isready", "-U", DB_USER, "-d", DB_NAME]);
    if (probe.status === 0) return;
    sleep(250);
  }
  throw new Error(`Timed out waiting for PostgreSQL in container ${name}`);
}

function execSql(name, sql, label) {
  const result = run(
    "docker",
    ["exec", "-i", name, "psql", "-v", "ON_ERROR_STOP=1", "-U", DB_USER, "-d", DB_NAME],
    { input: sql },
  );
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      [`SQL execution failed for ${label} on ${name}`, stdout ? `stdout:\n${stdout}` : "", stderr ? `stderr:\n${stderr}` : ""]
        .filter(Boolean)
        .join("\n"),
    );
  }
}

function listMigrations(dir, filterFn) {
  return readdirSync(dir)
    .filter((entry) => entry.endsWith(".sql") && filterFn(entry))
    .sort((a, b) => a.localeCompare(b));
}

function applyMigrations(name, dir, files) {
  execSql(name, "CREATE EXTENSION IF NOT EXISTS pgcrypto;", "pgcrypto extension");
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    execSql(name, sql, file);
  }
}

function sqlArrayLiteral(values) {
  return values.map((v) => `'${v.replaceAll("'", "''")}'`).join(", ");
}

function queryJson(name, sql) {
  const wrapped = `
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (${sql}) AS t;
  `;
  const result = mustRun("docker", [
    "exec",
    name,
    "psql",
    "-X",
    "-A",
    "-t",
    "-v",
    "ON_ERROR_STOP=1",
    "-U",
    DB_USER,
    "-d",
    DB_NAME,
    "-c",
    wrapped,
  ]);
  return JSON.parse(result.stdout.trim() || "[]");
}

function normalizeWhitespace(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\s+/g, " ").trim();
}

function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = normalizeWhitespace(value);
  }
  return out;
}

function sortedRows(rows) {
  return rows
    .map((row) => normalizeRow(row))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function collectSnapshot(name) {
  const schemas = sqlArrayLiteral(SCHEMAS);
  return {
    tables: sortedRows(
      queryJson(
        name,
        `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema IN (${schemas}) AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name
      `,
      ),
    ),
    columns: sortedRows(
      queryJson(
        name,
        `
        SELECT table_schema, table_name, ordinal_position, column_name, data_type, udt_name, is_nullable,
               column_default, character_maximum_length, numeric_precision, numeric_scale, datetime_precision
        FROM information_schema.columns
        WHERE table_schema IN (${schemas})
        ORDER BY table_schema, table_name, ordinal_position
      `,
      ),
    ),
    constraints: sortedRows(
      queryJson(
        name,
        `
        SELECT tc.table_schema, tc.table_name, tc.constraint_type,
               COALESCE(string_agg(kcu.column_name, ',' ORDER BY kcu.ordinal_position), '') AS columns,
               COALESCE(cc.check_clause, '') AS check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_catalog = kcu.constraint_catalog
         AND tc.constraint_schema = kcu.constraint_schema
         AND tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.check_constraints cc
          ON tc.constraint_catalog = cc.constraint_catalog
         AND tc.constraint_schema = cc.constraint_schema
         AND tc.constraint_name = cc.constraint_name
        WHERE tc.table_schema IN (${schemas})
          AND (
            tc.constraint_type <> 'CHECK'
            OR cc.check_clause IS NULL
            OR cc.check_clause NOT LIKE '% IS NOT NULL'
          )
        GROUP BY tc.table_schema, tc.table_name, tc.constraint_type, cc.check_clause
        ORDER BY tc.table_schema, tc.table_name, tc.constraint_type, columns, check_clause
      `,
      ),
    ),
    indexes: sortedRows(
      queryJson(
        name,
        `
        SELECT schemaname AS table_schema, tablename AS table_name, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname IN (${schemas})
        ORDER BY schemaname, tablename, indexname
      `,
      ),
    ),
    triggers: sortedRows(
      queryJson(
        name,
        `
        SELECT n.nspname AS table_schema, c.relname AS table_name, t.tgname AS trigger_name,
               pg_get_triggerdef(t.oid, true) AS trigger_def
        FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE NOT t.tgisinternal
          AND n.nspname IN (${schemas})
        ORDER BY n.nspname, c.relname, t.tgname
      `,
      ),
    ),
    functions: sortedRows(
      queryJson(
        name,
        `
        SELECT n.nspname AS function_schema, p.proname AS function_name,
               pg_get_function_identity_arguments(p.oid) AS function_args,
               pg_get_functiondef(p.oid) AS function_def
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname IN (${schemas})
        ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
      `,
      ),
    ),
  };
}

function diffSection(buildRows, canonicalRows) {
  const buildSet = new Set(buildRows.map((row) => JSON.stringify(row)));
  const canonicalSet = new Set(canonicalRows.map((row) => JSON.stringify(row)));
  const onlyInBuild = [...buildSet].filter((x) => !canonicalSet.has(x)).map((x) => JSON.parse(x));
  const onlyInCanonical = [...canonicalSet].filter((x) => !buildSet.has(x)).map((x) => JSON.parse(x));
  return { onlyInBuild, onlyInCanonical };
}

function compareSnapshots(buildSnapshot, canonicalSnapshot) {
  const sectionNames = Object.keys(buildSnapshot);
  const diffs = [];
  for (const section of sectionNames) {
    const diff = diffSection(buildSnapshot[section], canonicalSnapshot[section]);
    if (diff.onlyInBuild.length > 0 || diff.onlyInCanonical.length > 0) {
      diffs.push({
        section,
        onlyInBuild: diff.onlyInBuild.slice(0, 50),
        onlyInCanonical: diff.onlyInCanonical.slice(0, 50),
        onlyInBuildCount: diff.onlyInBuild.length,
        onlyInCanonicalCount: diff.onlyInCanonical.length,
      });
    }
  }
  return diffs;
}

const runtimeContainer = `taxcore-mig-runtime-${Date.now()}`;
const canonicalContainer = `taxcore-mig-canonical-${Date.now()}`;

const runtimeFiles = listMigrations(runtimeMigrationsDir, () => true);
const canonicalFiles = listMigrations(canonicalMigrationsDir, (name) => name.startsWith("V"));

try {
  createContainer(runtimeContainer);
  createContainer(canonicalContainer);
  waitForPostgres(runtimeContainer);
  waitForPostgres(canonicalContainer);

  applyMigrations(runtimeContainer, runtimeMigrationsDir, runtimeFiles);
  applyMigrations(canonicalContainer, canonicalMigrationsDir, canonicalFiles);

  const runtimeSnapshot = collectSnapshot(runtimeContainer);
  const canonicalSnapshot = collectSnapshot(canonicalContainer);
  const diffs = compareSnapshots(runtimeSnapshot, canonicalSnapshot);

  writeFileSync(
    join(reportsDir, "migration-compat-runtime-snapshot.json"),
    `${JSON.stringify(runtimeSnapshot, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    join(reportsDir, "migration-compat-canonical-snapshot.json"),
    `${JSON.stringify(canonicalSnapshot, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(join(reportsDir, "migration-compat-diff.json"), `${JSON.stringify(diffs, null, 2)}\n`, "utf8");

  if (diffs.length > 0) {
    console.error("Migration compatibility drift detected between build/db/migrations and database/migrations.");
    console.error(`See ${join(reportsDir, "migration-compat-diff.json")} for details.`);
    process.exit(1);
  }

  console.log("Migration compatibility check passed: runtime and canonical schemas are equivalent.");
} finally {
  stopContainer(runtimeContainer);
  stopContainer(canonicalContainer);
}
