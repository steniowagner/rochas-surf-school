import { RefObject } from "react";
import { TextInput } from "react-native";

export type OtpInputStatus = "neutral" | "error";

export type OtpInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  status?: OtpInputStatus;
  editable?: boolean;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  /** Lets the parent focus the input (for example after a wrong code). */
  inputRef?: RefObject<TextInput | null>;
};

export type UseOtpInputProps = {
  onChangeText: (value: string) => void;
  length: number;
  inputRef?: RefObject<TextInput | null>;
};
