import postgres from "postgres";
import { buildApp } from "./app.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://taxcore:taxcore@localhost:5432/taxcore_local";
const PORT = Number(process.env.SERVICE_PORT ?? 3000);

function isLocalLikeEnv(env: string): boolean {
  return env === "local" || env === "development" || env === "test";
}

function validateSecretKey(name: "SESSION_SIGNING_KEY" | "SESSION_ENCRYPTION_KEY"): void {
  const env = process.env.NODE_ENV ?? "development";
  const key = process.env[name]?.trim();

  if (!key) {
    if (isLocalLikeEnv(env)) {
      throw new Error(`FATAL: ${name} must be set even in local/dev`);
    }
    throw new Error(`FATAL: ${name} is required in non-local environments`);
  }

  const placeholderValues = [
    "local-dev-signing-key-change-in-production",
    "local-dev-signing-key-20260225-min-32-characters",
    "local-dev-encryption-key-20260225-min-32-characters",
    "replace-with-local-signing-key-min-32-chars",
    "replace-with-local-encryption-key",
    "replace-me",
  ];
  if (placeholderValues.includes(key) && !isLocalLikeEnv(env)) {
    throw new Error(`FATAL: placeholder ${name} is not allowed outside local/dev/test`);
  }
}

validateSecretKey("SESSION_SIGNING_KEY");
validateSecretKey("SESSION_ENCRYPTION_KEY");

const sql = postgres(DATABASE_URL, { max: 10 });
const app = buildApp({ sql });

app.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
