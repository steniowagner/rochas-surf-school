import { VerifySignInCodeResponse } from "../../hooks/use-verify-sign-in-code.hook";

export type ConfirmCodeProps = {
  email: string;
  /** Present on the create-account path; absent when the person is signing in to an existing account. */
  name?: string;
  onVerified?: (response: VerifySignInCodeResponse) => void;
};

export type UseConfirmCodeProps = ConfirmCodeProps;
