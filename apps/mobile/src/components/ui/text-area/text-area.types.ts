import { Ref } from "react";
import { TextInput, TextInputProps } from "react-native";

export type TextAreaProps = Omit<
  TextInputProps,
  "multiline" | "value" | "maxLength"
> & {
  value: string;
  maxLength: number;
  label?: string;
  /** Set it when the text area is inside a `BottomModal`, so the sheet rises above the keyboard. */
  inBottomSheet?: boolean;
  ref?: Ref<TextInput>;
};
