import { Text, TextInput as NativeTextInput, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import { TextAreaProps } from "./text-area.types";

export function TextArea({
  value,
  maxLength,
  label,
  ref,
  ...props
}: TextAreaProps) {
  const theme = useTheme();

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="ds-text-list-subtitle px-1 text-ink-2">{label}</Text>
      ) : null}
      <View className="min-h-[120px] rounded-control border-[1.5px] border-input-line bg-input px-3.5 py-3">
        <NativeTextInput
          ref={ref}
          className="ds-text-body min-h-[96px] flex-1 py-0 text-ink leading-5"
          textAlignVertical="top"
          placeholderTextColor={theme.ink2}
          accessibilityLabel={label}
          {...props}
          multiline
          value={value}
          maxLength={maxLength}
        />
      </View>
      <Text className="ds-text-list-subtitle px-1 text-right text-ink-2">
        {`${value.length}/${maxLength}`}
      </Text>
    </View>
  );
}
