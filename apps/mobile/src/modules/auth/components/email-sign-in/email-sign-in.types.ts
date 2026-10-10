import { TextInputStatus } from "@/components/ui/text-input/text-input.types";

export type EmailSignInProps = {
  /** Called with the trimmed email once the code was requested (or was already sent less than 30 s ago). */
  onCodeRequested?: (email: string) => void;
  /** Called with the email typed so far, trimmed, when the person asks to create an account instead. */
  onCreateAccountPress?: (email: string) => void;
};

export type UseEmailSignInProps = EmailSignInProps;

export type EmailFieldState = {
  value: string;
  status: TextInputStatus;
  errorMessage: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};
