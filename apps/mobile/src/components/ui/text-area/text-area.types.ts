import { Ref } from "react";
import { TextInput, TextInputProps } from "react-native";

export type TextAreaProps = Omit<
  TextInputProps,
  "multiline" | "value" | "maxLength"
> & {
  value: string;
  maxLength: number;
  label?: string;
  ref?: Ref<TextInput>;
};
