import { TextInputStatus } from "@/components/ui/text-input/text-input.types";

export type CodeRequest = {
  name: string;
  email: string;
};

export type CreateAccountProps = {
  onCodeRequested?: (request: CodeRequest) => void;
};

export type UseCreateAccountProps = CreateAccountProps;

export type FieldState = {
  value: string;
  status: TextInputStatus;
  errorMessage?: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
};
