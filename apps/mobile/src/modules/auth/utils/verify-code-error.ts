import { ApiError, NetworkError } from "@/services/api";

export type VerifyCodeError = {
  key: string;
  /** `inline` goes under the code boxes; `toast` goes through the alert message. */
  placement: "inline" | "toast";
};

const inlineKeyByErrorCode: Record<string, string> = {
  "signInCode.code.invalid": "confirmCode.errors.wrongCode",
  "signInCode.code.expired": "confirmCode.errors.expired",
  "signInCode.attempts.exceeded": "confirmCode.errors.locked",
};

const NAME_ERROR_PREFIX = "user.name.";
const RATE_LIMITED = "request.rate.limited";

const toast = (key: string): VerifyCodeError => ({ key, placement: "toast" });

/** The message for an error of `POST /auth/email/verify`, and where to show it. */
export const getVerifyCodeError = (error: unknown): VerifyCodeError => {
  if (error instanceof NetworkError) {
    return toast("createAccount.errors.noConnection");
  }

  if (error instanceof ApiError) {
    const errorCode = error.errors[0] ?? "";
    const inlineKey = inlineKeyByErrorCode[errorCode];

    if (inlineKey) {
      return { key: inlineKey, placement: "inline" };
    }

    if (errorCode.startsWith(NAME_ERROR_PREFIX)) {
      return toast("confirmCode.errors.nameNotSaved");
    }

    if (errorCode === RATE_LIMITED) {
      return toast("createAccount.errors.tooManyAttempts");
    }
  }

  return toast("createAccount.errors.generic");
};
