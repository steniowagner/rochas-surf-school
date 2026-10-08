import { Pressable, Text, TextInput, View } from "react-native";

import { useOtpInput } from "./otp-input.hook";
import { OtpInputProps } from "./otp-input.types";

const borderClasses = {
  neutral: "border-input-line",
  error: "border-bad",
};

export function OtpInput({
  value,
  onChangeText,
  length = 6,
  status = "neutral",
  editable = true,
  autoFocus = false,
  accessibilityLabel,
}: OtpInputProps) {
  const { inputRef, handleChangeText, focus } = useOtpInput({
    onChangeText,
    length,
  });

  return (
    <View>
      <Pressable
        accessible={false}
        className="flex-row gap-2"
        onPress={focus}
        testID="otp-boxes"
      >
        {Array.from({ length }, (_, index) => {
          const border =
            status === "error"
              ? borderClasses.error
              : index === value.length && editable
                ? "border-sun"
                : borderClasses.neutral;

          return (
            <View
              key={index}
              testID="otp-box"
              className={`h-[60px] flex-1 items-center justify-center rounded-control border-2 bg-input ${border}`}
            >
              <Text className="ds-text-lesson-time text-ink">
                {value[index] ?? ""}
              </Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        accessibilityLabel={accessibilityLabel}
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={editable}
        keyboardType="number-pad"
        onChangeText={handleChangeText}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          opacity: 0,
        }}
        textContentType="oneTimeCode"
        value={value}
      />
    </View>
  );
}
