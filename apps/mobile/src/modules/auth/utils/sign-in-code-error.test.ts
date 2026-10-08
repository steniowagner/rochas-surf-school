import { ApiError, NetworkError } from "@/services/api";

import { getSignInCodeErrorKey } from "./sign-in-code-error";

describe("getSignInCodeErrorKey", () => {
  it.each([
    [new ApiError(422, ["signInCode.email.invalid"]), "invalidEmail"],
    [new ApiError(429, ["request.rate.limited"]), "tooManyAttempts"],
    [new ApiError(502, ["signInCode.email.sendFailed"]), "sendFailed"],
    [new NetworkError(), "noConnection"],
    [new ApiError(500, ["INTERNAL_SERVER_ERROR"]), "generic"],
    [new ApiError(422, ["signInCode.locale.invalid"]), "generic"],
    [new ApiError(418, ["something.unknown"]), "generic"],
    [new ApiError(500, []), "generic"],
    [new Error("boom"), "generic"],
  ])("maps %p to %s", (error, key) => {
    expect(getSignInCodeErrorKey(error)).toBe(`createAccount.errors.${key}`);
  });
});
