export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundDomainError extends DomainError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class InvalidTargetError extends DomainError {
  constructor(message = 'Invalid target for operation') {
    super(message, 'INVALID_TARGET', 422);
  }
}

export class ConflictDomainError extends DomainError {
  constructor(message = 'Operation conflict') {
    super(message, 'CONFLICT', 409);
  }
}
