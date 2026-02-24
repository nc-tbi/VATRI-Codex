# Tax Core — Phase 1 Build

> **Status:** Phase 1 — Full Microservices
> **Version:** 2.0.0
> **Scenarios covered:** S01-S19
> **Sources:** `architecture/delivery/capability-to-backlog-mapping.md`, `design/01-vat-filing-assessment-solution-design.md` (v1.6)

---

## Overview

Phase 1 Tax Core (Danish VAT) — full microservices implementation. Six Fastify HTTP services, each owning its bounded context, backed by PostgreSQL schemas and Kafka event topics. Domain logic lives in the `@tax-core/domain` shared package and is reused by all services.

```
[PLATFORM]     PostgreSQL 16 · Redpanda (Kafka) · Apicurio Schema Registry
[VAT-GENERIC]  6 Fastify services · npm workspaces monorepo
[DK VAT]       @tax-core/domain — DK-VAT-001–DK-VAT-007 (ML §§ 4, 13, 34, 37, 46)
```

---

## Repository Structure

```
build/
├── local/                         # Infra-only Docker Compose (PostgreSQL, Redpanda, Kafka UI, Apicurio)
├── scripts/local/                 # PowerShell dev scripts
│   ├── start-local.ps1            # Start infra only
│   ├── stop-local.ps1             # Stop all stacks
│   ├── status.ps1                 # Show container status + endpoints
│   └── run-local.ps1              # Start full stack (infra + services)
├── packages/
│   └── domain/                    # @tax-core/domain — shared domain logic (105 tests)
│       └── src/                   # All bounded context modules
├── services/
│   ├── filing-service/            # port 3001 — POST /vat-filings, GET /vat-filings/:id
│   ├── validation-service/        # port 3002 — POST /validations (stateless)
│   ├── rule-engine-service/       # port 3003 — POST /rule-evaluations, GET /rules
│   ├── assessment-service/        # port 3004 — POST /assessments, GET /assessments/:id
│   ├── amendment-service/         # port 3005 — POST /amendments, GET /amendments/:filing_id
│   └── claim-orchestrator/        # port 3006 — POST /claims, GET /claims/:id
├── openapi/                       # OpenAPI 3.1 specs (one per service)
├── db/migrations/                 # PostgreSQL DDL — one schema per bounded context
├── docker-compose.services.yml    # Full stack (infra + all 6 services)
└── README.md
```

---

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop (for full stack or integration)

---

## Quick Start — Domain Tests (no Docker needed)

```bash
cd build
npm install
npm test          # → 105 tests pass (@tax-core/domain)
npm run typecheck # TypeScript strict check (zero errors)
```

---

## Quick Start — Full Stack

```powershell
cd build

# Option A — PowerShell scripts
.\scripts\local\run-local.ps1          # builds + starts everything

# Option B — Docker Compose directly
docker compose -f docker-compose.services.yml up --build
```

Services start in this order: postgres + redpanda (healthchecked) → all 6 Tax Core services.

---

## Service Endpoints

| Service | Port | Routes |
|---|---|---|
| filing-service | 3001 | `POST /vat-filings`, `GET /vat-filings/:id`, `GET /health` |
| validation-service | 3002 | `POST /validations`, `GET /health` |
| rule-engine-service | 3003 | `POST /rule-evaluations`, `GET /rules`, `GET /health` |
| assessment-service | 3004 | `POST /assessments`, `GET /assessments/:id`, `GET /health` |
| amendment-service | 3005 | `POST /amendments`, `GET /amendments/:filing_id`, `GET /health` |
| claim-orchestrator | 3006 | `POST /claims`, `GET /claims/:id`, `GET /health` |
| Kafka UI | 8085 | Web UI — Redpanda/Kafka topics |
| Apicurio Registry | 8081 | Schema registry |

---

## Smoke Test (end-to-end filing)

```bash
# Submit a regular VAT filing (filing-service orchestrates all steps)
curl -s -X POST http://localhost:3001/vat-filings \
  -H "Content-Type: application/json" \
  -H "x-trace-id: smoke-test-001" \
  -d '{
    "filing_id": "00000000-0000-0000-0000-000000000001",
    "taxpayer_id": "TXP-12345678",
    "cvr_number": "12345678",
    "tax_period_start": "2025-01-01",
    "tax_period_end": "2025-03-31",
    "filing_type": "regular",
    "submission_timestamp": "2025-04-10T09:00:00Z",
    "contact_reference": "CFO-DK",
    "source_channel": "api",
    "rule_version_id": "DK-VAT-001|DK-VAT-002|DK-VAT-003|DK-VAT-004|DK-VAT-005|DK-VAT-006|DK-VAT-007",
    "assessment_version": 1,
    "output_vat_amount_domestic": 25000,
    "reverse_charge_output_vat_goods_abroad_amount": 0,
    "reverse_charge_output_vat_services_abroad_amount": 5000,
    "input_vat_deductible_amount_total": 40000,
    "adjustments_amount": 0,
    "rubrik_a_goods_eu_purchase_value": 0,
    "rubrik_a_services_eu_purchase_value": 20000,
    "rubrik_b_goods_eu_sale_value": 0,
    "rubrik_b_services_eu_sale_value": 0,
    "rubrik_c_other_vat_exempt_supplies_value": 0
  }' | jq .
# → 201 { filing_id, state: "claim_created", trace_id, assessment: { result_type: "refund", ... } }

# Check assessment
curl http://localhost:3003/rules | jq .rules[].rule_id

# Validate a filing directly
curl -s -X POST http://localhost:3002/validations \
  -H "Content-Type: application/json" \
  -d '{"filing_id": "...", "cvr_number": "12345678", ...}' | jq .
```

---

## Architecture

### Bounded Contexts → Services

| Service | Bounded Context | Key ADR |
|---|---|---|
| filing-service | Filing + orchestration | ADR-001 |
| validation-service | Validation (stateless) | — |
| rule-engine-service | Tax Rule (effective-dated) | ADR-002 |
| assessment-service | Tax Rule & Assessment (S1-S4) | ADR-003 |
| amendment-service | Amendment (versioned) | ADR-005 |
| claim-orchestrator | Claim (outbox + idempotency) | ADR-004 |

### Kafka Topics

| Topic | Published by | Event |
|---|---|---|
| `tax-core.filing.received` | filing-service | Filing accepted |
| `tax-core.filing.assessed` | filing-service, assessment-service | Assessment complete |
| `tax-core.claim.created` | filing-service, claim-orchestrator | Claim intent created |
| `tax-core.amendment.created` | amendment-service | Amendment versioned |

All events use **CloudEvents 1.0** envelope (ADR-006).

### PostgreSQL Schemas

| Schema | Tables | Service |
|---|---|---|
| `filing` | `filings` | filing-service |
| `assessment` | `assessments` | assessment-service |
| `amendment` | `amendments` | amendment-service |
| `claim` | `claim_intents` | claim-orchestrator |
| `audit` | `evidence_records` | (shared, append-only) |

Migrations in `db/migrations/` — auto-loaded by PostgreSQL on first start (mounted as initdb).

---

## Domain Package (`@tax-core/domain`)

All bounded context logic lives here. Services import from this package.

### Staged Assessment (S1-S4)

```
Stage 1 = domestic output VAT + rc_goods + rc_services        (gross output)
Stage 2 = input_vat_deductible_total                          (deductible input)
Stage 3 = stage1 - stage2                                     (pre-adjustment net)
Stage 4 = stage3 + adjustments                                (final net VAT)
result_type: payable | refund | zero
claim_amount: abs(stage4)
```

### DK VAT Rules (ADR-002)

| Rule | Legal ref | Effect |
|---|---|---|
| DK-VAT-001 | ML § 4 stk.1 | Domestic output VAT |
| DK-VAT-002 | ML § 46 | Reverse charge — goods from abroad |
| DK-VAT-003 | ML § 46 | Reverse charge — services from abroad |
| DK-VAT-004 | ML § 37 | Input VAT deduction |
| DK-VAT-005 | ML § 34 | EU B2B zero-rated supplies |
| DK-VAT-006 | ML § 13 | VAT-exempt supplies |
| DK-VAT-007 | — | Zero-filing consistency |

---

## Test Coverage

| File | Scenarios | Tests |
|---|---|---|
| `validation.test.ts` | S01-S08 | 24 |
| `assessment.test.ts` | S01-S05 | 17 |
| `rule-engine.test.ts` | (supporting) | 14 |
| `amendment.test.ts` | S04-S05 | 9 |
| `claim.test.ts` | S01-S03 | 15 |
| `filing.test.ts` | S01-S19 | 21 |
| `sprint1-filing-integration.test.ts` | Integration | 5 |
| **Total** | | **105** |

```bash
npm test -w @tax-core/domain   # run domain tests only (no Docker required)
```

---

## Dev Scripts (PowerShell)

```powershell
.\scripts\local\start-local.ps1      # start infra only (PostgreSQL + Redpanda)
.\scripts\local\run-local.ps1        # start full stack (--build by default)
.\scripts\local\run-local.ps1 -NoBuild  # skip Docker build step
.\scripts\local\status.ps1           # show container status + endpoints
.\scripts\local\stop-local.ps1       # stop all containers
.\scripts\local\stop-local.ps1 -RemoveVolumes  # also remove volumes
```

---

## Implementation Constraints (CODE_BUILDER.md v2.1.0)

- **Determinism**: VAT calculations are pure functions; no random or time-based branching in domain logic.
- **Append-only audit**: `EvidenceWriter` never mutates or deletes records (ADR-003).
- **Idempotency**: Claim outbox keyed by `taxpayer_id:period_end:rule_version_id` (ADR-004).
- **No AI in assessment path**: All outcomes from rule evaluation + deterministic arithmetic.
- **Open source only**: Fastify, postgres, KafkaJS, Zod, Vitest (ADR-008).
- **Contract-first**: OpenAPI 3.1 specs in `openapi/` govern all HTTP interfaces (ADR-006).

---

## Out of Scope (Phase 1)

Portal BFF, Kong Gateway, registration/obligation services, ViDA Step 1-3 (S26-S34), special schemes (Phase 5) — all Phase 2+.
