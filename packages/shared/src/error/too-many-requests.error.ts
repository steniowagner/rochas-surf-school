import { DomainError } from "./domain.error";

export class TooManyRequestsError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 429, details);
  }
}
