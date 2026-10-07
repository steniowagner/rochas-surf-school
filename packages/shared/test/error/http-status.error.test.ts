import {
  BadGatewayError,
  DomainError,
  TooManyRequestsError,
} from "../../src/index";

describe("DomainError details", () => {
  test("has no details by default", () => {
    const error = new DomainError("domain.error");

    expect(error.details).toBeUndefined();
  });

  test("keeps the details it was given", () => {
    const error = new DomainError("domain.error", 400, { field: "value" });

    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: "value" });
  });
});

describe("TooManyRequestsError", () => {
  test("has status 429, the message and the details", () => {
    const details = { resendAvailableAt: "2026-10-07T12:00:30.000Z" };
    const error = new TooManyRequestsError("signInCode.resend.tooSoon", details);

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect(error.name).toBe("TooManyRequestsError");
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe("signInCode.resend.tooSoon");
    expect(error.details).toEqual(details);
  });

  test("has no details when none are given", () => {
    const error = new TooManyRequestsError("request.rate.limited");

    expect(error.details).toBeUndefined();
  });
});

describe("BadGatewayError", () => {
  test("has status 502 and the message", () => {
    const error = new BadGatewayError("signInCode.email.sendFailed");

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(BadGatewayError);
    expect(error.name).toBe("BadGatewayError");
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe("signInCode.email.sendFailed");
    expect(error.details).toBeUndefined();
  });

  test("keeps the details it was given", () => {
    const error = new BadGatewayError("signInCode.email.sendFailed", { provider: "resend" });

    expect(error.details).toEqual({ provider: "resend" });
  });
});
