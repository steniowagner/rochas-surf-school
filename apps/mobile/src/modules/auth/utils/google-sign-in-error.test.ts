import { ApiError, NetworkError } from "@/services/api";

import {
  getGoogleApiErrorKey,
  getGoogleSignInError,
} from "./google-sign-in-error";

describe("getGoogleSignInError", () => {
  it.each(["SIGN_IN_CANCELLED", "IN_PROGRESS"])(
    "shows nothing for %s",
    (code) => {
      expect(getGoogleSignInError({ code })).toBeNull();
    },
  );

  it("explains that Google Play services is unavailable", () => {
    expect(getGoogleSignInError({ code: "PLAY_SERVICES_NOT_AVAILABLE" })).toBe(
      "googleSignIn.playServices",
    );
  });

  it("shows the no-connection message when the API is unreachable", () => {
    expect(getGoogleSignInError(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
  });

  it.each([
    ["auth.google.tokenInvalid", "googleSignIn.tokenInvalid"],
    ["auth.google.emailNotVerified", "googleSignIn.emailNotVerified"],
    ["request.rate.limited", "createAccount.errors.generic"],
  ])("maps the API error %s", (errorCode, key) => {
    expect(getGoogleSignInError(new ApiError(401, [errorCode]))).toBe(key);
  });

  it.each([
    new ApiError(500, []),
    { code: "SOMETHING_ELSE" },
    new Error("boom"),
    undefined,
  ])("falls back to the generic message for %p", (error) => {
    expect(getGoogleSignInError(error)).toBe("createAccount.errors.generic");
  });
});

describe("getGoogleApiErrorKey", () => {
  it.each([
    [new NetworkError(), "createAccount.errors.noConnection"],
    [
      new ApiError(401, ["auth.google.tokenInvalid"]),
      "googleSignIn.tokenInvalid",
    ],
    [new ApiError(500, []), "createAccount.errors.generic"],
    [{ code: "PLAY_SERVICES_NOT_AVAILABLE" }, "createAccount.errors.generic"],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("maps %p", (error, key) => {
    expect(getGoogleApiErrorKey(error)).toBe(key);
  });
});
