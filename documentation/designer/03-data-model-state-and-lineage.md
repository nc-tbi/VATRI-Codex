# 03 - Data Model, State, and Lineage

## Objective
Summarize the designed data and lifecycle constraints that are critical to implementation correctness.

## Core Model Principles
- Operational records are strongly consistent in relational storage.
- Audit evidence is append-only and trace-correlated.
- Assessment/amendment history is immutable and versioned.

## Entity and State Highlights
- Filing:
  - intake, validation, assessment linking, and source traceability.
- Assessment:
  - staged values (`stage1`..`stage4`), result typing, versioning.
  - append-only; no destructive overwrite flow.
- Amendment:
  - lineage pointer to prior assessment/version.
  - delta classification: `increase`, `decrease`, `neutral`.
- Claim:
  - idempotency-keyed intent state machine
  - dispatch lifecycle: `queued -> sent -> acked | failed -> dead_letter`.

## Lineage Requirements
- `prior_assessment_id` links amendment versions.
- `supersedes_assessment_id` links preliminary/final supersession flows.
- audit evidence and event stream must allow full reconstruction from `trace_id`.

## Determinism Requirements
- rule version is pinned at intake/evaluation points.
- replay of same input + version must produce equivalent legal outcome.
- idempotent replays must avoid duplicate side effects/events.
