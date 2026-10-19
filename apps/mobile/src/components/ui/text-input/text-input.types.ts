import { ReactNode, Ref } from "react";
import { TextInput, TextInputProps } from "react-native";

export type TextInputStatus = "neutral" | "error";

export type TextInputComponentProps = TextInputProps & {
  icon: ReactNode;
  status?: TextInputStatus;
  errorMessage?: string;
  clearable?: boolean;
  ref?: Ref<TextInput>;
};
