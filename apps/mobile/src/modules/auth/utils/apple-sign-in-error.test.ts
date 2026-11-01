import { ApiError, NetworkError } from "@/services/api";

import {
  getAppleApiErrorKey,
  getAppleSignInError,
} from "./apple-sign-in-error";

describe("getAppleSignInError", () => {
  it("shows nothing when the person closed Apple's sheet", () => {
    expect(getAppleSignInError({ code: "ERR_REQUEST_CANCELED" })).toBeNull();
  });

  it("shows the no-connection message when the API is unreachable", () => {
    expect(getAppleSignInError(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
  });

  it.each([
    ["auth.apple.tokenInvalid", "appleSignIn.tokenInvalid"],
    ["auth.apple.emailNotVerified", "appleSignIn.emailNotVerified"],
    ["auth.apple.emailMissing", "appleSignIn.emailMissing"],
    ["request.rate.limited", "createAccount.errors.generic"],
  ])("maps the API error %s", (errorCode, key) => {
    expect(getAppleSignInError(new ApiError(401, [errorCode]))).toBe(key);
  });

  it.each([
    new ApiError(500, []),
    { code: "ERR_REQUEST_FAILED" },
    new Error("Apple gave no identity token"),
    undefined,
    null,
    "boom",
  ])("falls back to the generic message for %p", (error) => {
    expect(getAppleSignInError(error)).toBe("createAccount.errors.generic");
  });
});

describe("getAppleApiErrorKey", () => {
  it.each([
    [new NetworkError(), "createAccount.errors.noConnection"],
    [
      new ApiError(401, ["auth.apple.tokenInvalid"]),
      "appleSignIn.tokenInvalid",
    ],
    [new ApiError(500, []), "createAccount.errors.generic"],
    [{ code: "ERR_REQUEST_CANCELED" }, "createAccount.errors.generic"],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("maps %p", (error, key) => {
    expect(getAppleApiErrorKey(error)).toBe(key);
  });
});
