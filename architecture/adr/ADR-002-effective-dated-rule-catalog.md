# ADR-002: Effective-Dated Rule Catalog

## Status
Accepted

## Context
Danish VAT logic changes over time and must remain legally traceable for historic recalculation.

## Decision
Use an externalized rule catalog with `effective_from`/`effective_to`, legal references, and versioned rule sets. Services resolve `rule_version_id` at filing time.

## Consequences
- Legal adaptability without frequent code redeployments.
- Requires stronger rule lifecycle governance and testing discipline.
