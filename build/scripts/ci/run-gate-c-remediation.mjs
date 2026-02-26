import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const reportsDir = join(process.cwd(), "reports");
mkdirSync(reportsDir, { recursive: true });

const composeArgs = ["compose", "--env-file", ".env.portal.local", "-f", "docker-compose.services.yml"];
const cases = [];

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    ...opts,
  });
  return result;
}

function mustRun(cmd, args, label, opts = {}) {
  const result = run(cmd, args, opts);
  if (result.status !== 0) {
    throw new Error(`${label} failed (${cmd} ${args.join(" ")})\n${result.stdout || ""}\n${result.stderr || ""}`);
  }
  return result;
}

async function mustRunWithRetry(cmd, args, label, attempts = 3, delayMs = 3000) {
  let lastError = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return mustRun(cmd, args, label);
    } catch (error) {
      lastError = error;
      if (i === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function waitForHealth(url, maxAttempts = 90) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for health: ${url}`);
}

async function waitForAuthPortParity(maxAttempts = 90) {
  let lastExtStatus = 0;
  let lastInsideStatus = -1;
  for (let i = 0; i < maxAttempts; i += 1) {
    let extStatus = 0;
    try {
      const ext = await requestJson("http://localhost:3009/health", {
        headers: { "x-trace-id": `trace-${crypto.randomUUID()}` },
      });
      extStatus = ext.status;
    } catch {
      extStatus = 0;
    }
    const inside = run("docker", [
      ...composeArgs,
      "exec",
      "-T",
      "auth-service",
      "node",
      "-e",
      "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1));",
    ]);
    lastExtStatus = extStatus;
    lastInsideStatus = inside.status ?? -1;
    if (extStatus === 200 && inside.status === 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(
    `auth health checks did not pass on mapped/internal ports (external=${lastExtStatus}, internal=${lastInsideStatus})`
  );
}

async function requestJson(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: res.status, body };
}

function recordCase(caseId, status, detail) {
  cases.push({ case_id: caseId, status, detail });
}

async function loginAdmin() {
  const login = await requestJson("http://localhost:3009/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-trace-id": `trace-${crypto.randomUUID()}` },
    body: JSON.stringify({ username: "admin", password: "adminadmin" }),
  });
  if (login.status !== 200) {
    throw new Error(`admin login failed: ${login.status}`);
  }
  return login.body;
}

function makeAssessment(filingId, traceId, netVat, assessmentVersion) {
  const claimAmount = Math.abs(netVat);
  return {
    filing_id: filingId,
    trace_id: traceId,
    rule_version_id: "DK-VAT-001",
    assessed_at: new Date().toISOString(),
    assessment_version: assessmentVersion,
    stage1_gross_output_vat: 10000,
    stage2_total_deductible_input_vat: 3000,
    stage3_pre_adjustment_net_vat: netVat,
    stage4_net_vat: netVat,
    result_type: netVat > 0 ? "payable" : netVat < 0 ? "refund" : "zero",
    claim_amount: claimAmount,
  };
}

async function createAmendmentFixture() {
  const filingId = crypto.randomUUID();
  const amendedFilingId = crypto.randomUUID();
  const traceId = `trace-amend-${crypto.randomUUID()}`;
  const payload = {
    original_filing_id: filingId,
    taxpayer_id: "TXP-REM-001",
    tax_period_end: "2026-01-31",
    original_assessment: makeAssessment(filingId, `${traceId}-orig`, 7000, 1),
    new_assessment: makeAssessment(amendedFilingId, `${traceId}-new`, 7200, 2),
  };
  const res = await requestJson("http://localhost:3005/amendments", {
    method: "POST",
    headers: { "content-type": "application/json", "x-trace-id": traceId },
    body: JSON.stringify(payload),
  });
  if (res.status !== 201 || !res.body?.amendment_id) {
    throw new Error(`amendment fixture creation failed: ${res.status}`);
  }
  return { amendmentId: res.body.amendment_id, filingId };
}

async function runRemediation() {
  await mustRunWithRetry("docker", [...composeArgs, "up", "-d", "--build"], "compose up");
  await waitForHealth("http://localhost:3009/health");
  await waitForHealth("http://localhost:3005/health");
  await waitForHealth("http://localhost:3001/health");

  try {
    // TC-REM-AUTHADM-01
    await waitForAuthPortParity();
    recordCase("TC-REM-AUTHADM-01", "pass", "external and internal auth health checks passed");

    // TC-REM-AUTHADM-02
    await loginAdmin();
    mustRun("docker", ["restart", "taxcore-auth"], "restart auth");
    await waitForHealth("http://localhost:3009/health");
    await loginAdmin();
    recordCase("TC-REM-AUTHADM-02", "pass", "admin login succeeded before and after auth restart");

    // TC-REM-AUTHADM-03
    const sessionA = await loginAdmin();
    const refreshA = await requestJson("http://localhost:3009/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", "x-trace-id": `trace-${crypto.randomUUID()}` },
      body: JSON.stringify({ refresh_token: sessionA.refresh_token }),
    });
    if (refreshA.status !== 200 || !refreshA.body?.refresh_token) {
      throw new Error("initial refresh failed");
    }
    const oldReplay = await requestJson("http://localhost:3009/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", "x-trace-id": `trace-${crypto.randomUUID()}` },
      body: JSON.stringify({ refresh_token: sessionA.refresh_token }),
    });
    if (oldReplay.status !== 401) {
      throw new Error("rotated token did not invalidate old refresh token");
    }
    mustRun("docker", ["restart", "taxcore-auth"], "restart auth after refresh rotate");
    await waitForHealth("http://localhost:3009/health");
    const oldAfterRestart = await requestJson("http://localhost:3009/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", "x-trace-id": `trace-${crypto.randomUUID()}` },
      body: JSON.stringify({ refresh_token: sessionA.refresh_token }),
    });
    const newAfterRestart = await requestJson("http://localhost:3009/auth/refresh", {
      method: "POST",
      headers: { "content-type": "application/json", "x-trace-id": `trace-${crypto.randomUUID()}` },
      body: JSON.stringify({ refresh_token: refreshA.body.refresh_token }),
    });
    if (oldAfterRestart.status !== 401 || newAfterRestart.status !== 200) {
      throw new Error("refresh token persistence assertions failed after restart");
    }
    recordCase("TC-REM-AUTHADM-03", "pass", "refresh token rotate/revoke behavior persisted across restart");

    // Setup fixture for TC-REM-AUTHADM-04..06
    const { amendmentId } = await createAmendmentFixture();

    // TC-REM-AUTHADM-04
    const alterOk = await requestJson(`http://localhost:3005/amendments/${amendmentId}/alter`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trace-id": `trace-${crypto.randomUUID()}`,
        "x-user-role": "admin",
        "x-subject-id": "admin-subject",
      },
      body: JSON.stringify({ field_deltas: { note: "admin-change" } }),
    });
    const alterMissing = await requestJson(`http://localhost:3005/amendments/${crypto.randomUUID()}/alter`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trace-id": `trace-${crypto.randomUUID()}`,
        "x-user-role": "admin",
        "x-subject-id": "admin-subject",
      },
      body: JSON.stringify({ field_deltas: { note: "missing" } }),
    });
    if (alterOk.status !== 200 || alterMissing.status !== 404) {
      throw new Error(`amendment identity check failed (${alterOk.status}, ${alterMissing.status})`);
    }
    recordCase("TC-REM-AUTHADM-04", "pass", "amendment mutate endpoints resolve by amendment_id");

    // TC-REM-AUTHADM-05
    const undo = await requestJson(`http://localhost:3005/amendments/${amendmentId}/undo`, {
      method: "POST",
      headers: { "x-trace-id": `trace-${crypto.randomUUID()}`, "x-user-role": "admin", "x-subject-id": "admin-subject" },
    });
    const redo = await requestJson(`http://localhost:3005/amendments/${amendmentId}/redo`, {
      method: "POST",
      headers: { "x-trace-id": `trace-${crypto.randomUUID()}`, "x-user-role": "admin", "x-subject-id": "admin-subject" },
    });
    if (undo.status !== 200 || redo.status !== 200) {
      throw new Error(`alter lifecycle failed (${undo.status}, ${redo.status})`);
    }
    mustRun("docker", ["restart", "taxcore-amendment"], "restart amendment service");
    await waitForHealth("http://localhost:3005/health");
    const listAfterRestart = await requestJson("http://localhost:3005/amendments?taxpayer_id=TXP-REM-001&tax_period_end=2026-01-31", {
      headers: { "x-trace-id": `trace-${crypto.randomUUID()}` },
    });
    if (listAfterRestart.status !== 200 || !Array.isArray(listAfterRestart.body?.amendments) || listAfterRestart.body.amendments.length < 1) {
      throw new Error("amendment history not visible after restart");
    }
    recordCase("TC-REM-AUTHADM-05", "pass", "alter lifecycle remained durable across service restart");

    // TC-REM-AUTHADM-06
    const nonAdminAmendmentAlter = await requestJson(`http://localhost:3005/amendments/${amendmentId}/alter`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trace-id": `trace-${crypto.randomUUID()}`,
        "x-user-role": "taxpayer",
        "x-subject-id": "taxpayer-subject",
      },
      body: JSON.stringify({ field_deltas: { note: "should-not-work" } }),
    });
    const nonAdminFilingAlter = await requestJson(`http://localhost:3001/vat-filings/${crypto.randomUUID()}/alter`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-trace-id": `trace-${crypto.randomUUID()}`,
        "x-user-role": "taxpayer",
        "x-subject-id": "taxpayer-subject",
      },
      body: JSON.stringify({ field_deltas: { contact_reference: "blocked" } }),
    });
    if (nonAdminAmendmentAlter.status !== 403 || nonAdminFilingAlter.status !== 403) {
      throw new Error(`non-admin denial failed (${nonAdminAmendmentAlter.status}, ${nonAdminFilingAlter.status})`);
    }
    recordCase("TC-REM-AUTHADM-06", "pass", "non-admin callers are denied on mutate routes");

    // TC-REM-AUTHADM-07
    const missingKeyRun = run("docker", [
      ...composeArgs,
      "run",
      "--rm",
      "-e",
      "SESSION_SIGNING_KEY=",
      "-e",
      "SESSION_ENCRYPTION_KEY=",
      "-e",
      "ADMIN_SEED_ENABLED=false",
      "auth-service",
    ]);
    if (missingKeyRun.status === 0) {
      throw new Error("auth-service unexpectedly started without signing/encryption keys");
    }
    recordCase("TC-REM-AUTHADM-07", "pass", "auth startup fails fast when signing/encryption keys are missing");
  } catch (error) {
    const summary = {
      gate: "gate-c-remediation",
      generated_at: new Date().toISOString(),
      passed: false,
      cases,
      error: String(error),
    };
    writeFileSync(join(reportsDir, "gate-c-remediation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    throw error;
  } finally {
    run("docker", [...composeArgs, "down", "-v"]);
  }
}

runRemediation()
  .then(() => {
    const summary = {
      gate: "gate-c-remediation",
      generated_at: new Date().toISOString(),
      passed: cases.every((x) => x.status === "pass"),
      cases,
    };
    writeFileSync(join(reportsDir, "gate-c-remediation-summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    if (!summary.passed) process.exit(1);
    console.log("Gate C remediation command pack passed. Report: build/reports/gate-c-remediation-summary.json");
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
