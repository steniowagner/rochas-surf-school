import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import {
  getReactivationErrorKey,
  isReactivationAlreadyDecided,
} from "./reactivation-error";

describe("reactivation errors", () => {
  it.each([
    [
      new ApiError(409, ["reactivation.status.notRequested"]),
      "reactivations.alreadyDecided",
    ],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [new SessionExpiredError(), null],
    [new ApiError(409, ["something.else"]), "createAccount.errors.generic"],
    [
      new ApiError(404, ["reactivation.notFound"]),
      "createAccount.errors.generic",
    ],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("maps %p to %p", (error, key) => {
    expect(getReactivationErrorKey(error)).toBe(key);
  });

  it("recognizes only the already-decided conflict", () => {
    expect(
      isReactivationAlreadyDecided(
        new ApiError(409, ["reactivation.status.notRequested"]),
      ),
    ).toBe(true);
    expect(isReactivationAlreadyDecided(new ApiError(409, []))).toBe(false);
    expect(
      isReactivationAlreadyDecided(
        new ApiError(404, ["reactivation.status.notRequested"]),
      ),
    ).toBe(false);
    expect(isReactivationAlreadyDecided(new NetworkError())).toBe(false);
  });
});
