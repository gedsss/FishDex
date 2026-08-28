export class DomainError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "recurso não encontrado") {
    super(message, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "ação não permitida") {
    super(message, 403);
  }
}

export class ConflictError extends DomainError {
  constructor(message = "conflito") {
    super(message, 409);
  }
}