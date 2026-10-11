import { DomainError } from "./domain.error";

export class ConflictError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, details);
  }
}
