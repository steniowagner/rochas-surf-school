import { ApiError, NetworkError } from "@/services/api";

import { getVerifyCodeError } from "./verify-code-error";

describe("getVerifyCodeError", () => {
  it.each([
    ["signInCode.code.invalid", "confirmCode.errors.wrongCode"],
    ["signInCode.code.expired", "confirmCode.errors.expired"],
    ["signInCode.attempts.exceeded", "confirmCode.errors.locked"],
  ])("shows %s inline", (errorCode, key) => {
    expect(getVerifyCodeError(new ApiError(401, [errorCode]))).toEqual({
      key,
      placement: "inline",
    });
  });

  it.each([["user.name.required"], ["user.name.invalid"]])(
    "sends %s on the sign-in path to Create account",
    (errorCode) => {
      expect(getVerifyCodeError(new ApiError(422, [errorCode]), false)).toEqual(
        {
          key: "confirmCode.errors.noAccount",
          placement: "toast",
          opensCreateAccount: true,
        },
      );
    },
  );

  it("keeps the other errors the same on the sign-in path", () => {
    expect(
      getVerifyCodeError(new ApiError(401, ["signInCode.code.invalid"]), false),
    ).toEqual({
      key: "confirmCode.errors.wrongCode",
      placement: "inline",
    });
    expect(getVerifyCodeError(new NetworkError(), false)).toEqual({
      key: "createAccount.errors.noConnection",
      placement: "toast",
    });
  });

  it.each([
    [
      new ApiError(422, ["user.name.invalid"]),
      "confirmCode.errors.nameNotSaved",
    ],
    [
      new ApiError(422, ["user.name.tooShort"]),
      "confirmCode.errors.nameNotSaved",
    ],
    [
      new ApiError(429, ["request.rate.limited"]),
      "createAccount.errors.tooManyAttempts",
    ],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [
      new ApiError(500, ["INTERNAL_SERVER_ERROR"]),
      "createAccount.errors.generic",
    ],
    [new ApiError(418, ["something.unknown"]), "createAccount.errors.generic"],
    [new ApiError(500, []), "createAccount.errors.generic"],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("shows %p in the toast", (error, key) => {
    expect(getVerifyCodeError(error)).toEqual({ key, placement: "toast" });
  });
});
