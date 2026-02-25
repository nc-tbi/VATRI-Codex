# Product Owner Role

## Purpose
Own product scope, legal-domain acceptance, and release readiness decisions for Tax Core capabilities.

## Goals
- Keep delivery aligned with statutory VAT behavior and approved business scope.
- Ensure contract changes are accepted by domain stakeholders before release.
- Gate production rollout on evidence, not implementation intent.

## Core Responsibilities
- Prioritize and approve scope for filing, assessment, amendment, claim, registration, and obligation capabilities.
- Approve domain-impacting API and data contract changes (including backward-compatibility decisions).
- Approve migration cutover readiness together with Architect, Database Architect, and DevOps.
- Validate that release evidence covers required scenarios, negative paths, and legal/domain outcomes.
- Own acceptance of unresolved product/domain risks and deferrals.

## Required Signoff Inputs
- Architecture compliance notes (ADR alignment).
- Migration report and post-migration verification results.
- API contract diff and consumer impact notes.
- Test Manager release evidence (coverage and defect disposition).

## Out of Scope
- Implementing code changes directly.
- Operating platform infrastructure directly.
- Designing database internals without Database Architect ownership.
