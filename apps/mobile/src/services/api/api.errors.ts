export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly errors: string[],
    readonly details?: Record<string, unknown>,
  ) {
    super(errors[0] ?? `Request failed with status ${status}`);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor() {
    super("Network request failed");
    this.name = "NetworkError";
  }
}
