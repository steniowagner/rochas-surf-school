import { VerifySignInCodeResponse } from "../../hooks/use-verify-sign-in-code.hook";

export type ConfirmCodeProps = {
  email: string;
  name: string;
  onVerified?: (response: VerifySignInCodeResponse) => void;
};

export type UseConfirmCodeProps = ConfirmCodeProps;
