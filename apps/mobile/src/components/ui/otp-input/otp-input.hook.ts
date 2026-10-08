import { useRef } from "react";
import { TextInput } from "react-native";

import { UseOtpInputProps } from "./otp-input.types";

export const useOtpInput = ({ onChangeText, length }: UseOtpInputProps) => {
  const inputRef = useRef<TextInput>(null);

  // Keeps only the digits of what was typed or pasted ("Your code: 123 456" → "123456").
  const handleChangeText = (text: string) =>
    onChangeText(text.replace(/\D/g, "").slice(0, length));

  const focus = () => inputRef.current?.focus();

  return { inputRef, handleChangeText, focus };
};
