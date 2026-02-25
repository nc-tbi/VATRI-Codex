// shared/errors.ts — Domain error types for Tax Core Phase 1 + Phase 2

export class FilingStateError extends Error {
  constructor(
    public readonly currentState: string,
    public readonly attemptedTransition: string,
  ) {
    super(
      `Invalid state transition: cannot move from '${currentState}' via '${attemptedTransition}'`,
    );
    this.name = "FilingStateError";
  }
}

export class ValidationFailedError extends Error {
  constructor(public readonly issues: readonly { code: string; field: string; message: string }[]) {
    super(`Filing failed validation with ${issues.length} error(s)`);
    this.name = "ValidationFailedError";
  }
}

export class RuleResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleResolutionError";
  }
}

export class IdempotencyConflictError extends Error {
  constructor(public readonly idempotencyKey: string) {
    super(`Claim already exists for idempotency key: ${idempotencyKey}`);
    this.name = "IdempotencyConflictError";
  }
}

export class AmendmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AmendmentError";
  }
}

// Phase 2 error types

export class ObligationStateError extends Error {
  constructor(
    public readonly currentState: string,
    public readonly attemptedTransition: string,
  ) {
    super(
      `Invalid obligation state transition: cannot '${attemptedTransition}' from state '${currentState}'`,
    );
    this.name = "ObligationStateError";
  }
}

export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}
