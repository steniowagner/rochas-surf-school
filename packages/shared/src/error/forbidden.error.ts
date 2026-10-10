import { DomainError } from "./domain.error";

export class ForbiddenError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 403, details);
  }
}
