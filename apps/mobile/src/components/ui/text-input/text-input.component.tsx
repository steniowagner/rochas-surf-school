import { Text, TextInput as NativeTextInput, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { TextInputComponentProps, TextInputStatus } from "./text-input.types";

const borderClasses: Record<TextInputStatus, string> = {
  neutral: "border-input-line",
  error: "border-bad",
};

export function TextInput({
  icon,
  status = "neutral",
  errorMessage,
  ref,
  ...props
}: TextInputComponentProps) {
  const theme = useTheme();
  const isDisabled = props.editable === false;

  return (
    <View className="gap-1.5">
      <View
        className={`h-[52px] flex-row items-center gap-2.5 rounded-control border-[1.5px] px-3.5 ${
          isDisabled
            ? "border-line bg-dim"
            : `bg-input ${borderClasses[status]}`
        }`}
      >
        {icon}
        <NativeTextInput
          ref={ref}
          className={`ds-text-body h-full flex-1 py-0 leading-5 ${isDisabled ? "text-ink-2" : "text-ink"}`}
          textAlignVertical="center"
          placeholderTextColor={theme.ink2}
          {...props}
        />
      </View>
      {status === "error" && errorMessage ? (
        <Text className="ds-text-list-subtitle px-1 text-bad">
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
