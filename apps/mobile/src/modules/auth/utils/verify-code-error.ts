import { ApiError, NetworkError } from "@/services/api";

export type VerifyCodeError = {
  key: string;
  /** `inline` goes under the code boxes; `toast` goes through the alert message. */
  placement: "inline" | "toast";
  /** The address has no account: the person should go on to Create account. */
  opensCreateAccount?: boolean;
};

const inlineKeyByErrorCode: Record<string, string> = {
  "signInCode.code.invalid": "confirmCode.errors.wrongCode",
  "signInCode.code.expired": "confirmCode.errors.expired",
  "signInCode.attempts.exceeded": "confirmCode.errors.locked",
};

const NAME_ERROR_PREFIX = "user.name.";
const RATE_LIMITED = "request.rate.limited";

const toast = (key: string): VerifyCodeError => ({ key, placement: "toast" });

/**
 * The message for an error of `POST /auth/email/verify`, and where to show it. On the sign-in path (`hasName` false)
 * a name error means the address has no account, since the backend only asks for a name when it must create one.
 */
export const getVerifyCodeError = (
  error: unknown,
  hasName = true,
): VerifyCodeError => {
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
      return hasName
        ? toast("confirmCode.errors.nameNotSaved")
        : {
            ...toast("confirmCode.errors.noAccount"),
            opensCreateAccount: true,
          };
    }

    if (errorCode === RATE_LIMITED) {
      return toast("createAccount.errors.tooManyAttempts");
    }
  }

  return toast("createAccount.errors.generic");
};
