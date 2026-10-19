import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  Text,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  clearable = false,
  ref,
  ...props
}: TextInputComponentProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDisabled = props.editable === false;
  const showClear = clearable && !isDisabled && !!props.value;

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
        {showClear ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("common.clear")}
            activeOpacity={0.6}
            hitSlop={12}
            onPress={() => props.onChangeText?.("")}
          >
            <Ionicons name="close-circle" size={20} color={theme.ink2} />
          </TouchableOpacity>
        ) : null}
      </View>
      {status === "error" && errorMessage ? (
        <Text className="ds-text-list-subtitle px-1 text-bad">
          {errorMessage}
        </Text>
      ) : null}
    </View>
  );
}
