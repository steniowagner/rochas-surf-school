import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import {
  getRegistrationErrorKey,
  isAlreadyDecided,
} from "./registration-error";

describe("registration errors", () => {
  it.each([
    [
      new ApiError(409, ["registration.status.notPending"]),
      "registrations.alreadyDecided",
    ],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [new SessionExpiredError(), null],
    [new ApiError(409, ["something.else"]), "createAccount.errors.generic"],
    [
      new ApiError(500, ["INTERNAL_SERVER_ERROR"]),
      "createAccount.errors.generic",
    ],
    [new ApiError(403, ["user.role.notAdmin"]), "createAccount.errors.generic"],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("maps %p to %p", (error, key) => {
    expect(getRegistrationErrorKey(error)).toBe(key);
  });

  it("recognizes only the already-decided conflict", () => {
    expect(
      isAlreadyDecided(new ApiError(409, ["registration.status.notPending"])),
    ).toBe(true);
    expect(isAlreadyDecided(new ApiError(409, []))).toBe(false);
    expect(isAlreadyDecided(new ApiError(404, ["registration.notFound"]))).toBe(
      false,
    );
    expect(isAlreadyDecided(new NetworkError())).toBe(false);
  });
});
