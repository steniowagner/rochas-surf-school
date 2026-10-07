import { DomainError } from "./domain.error";

export class BadGatewayError extends DomainError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 502, details);
  }
}
