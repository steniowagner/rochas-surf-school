import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { CountryPicker } from "@/components/country-picker";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { PhoneNumberFieldProps } from "./phone-number-field.types";

/** The country button with its picker and the masked number input; its state comes from `usePhoneNumberField`. */
export function PhoneNumberField({
  country,
  dialCode,
  numberInput,
  onSelectCountry,
  label,
  onSubmitEditing,
}: PhoneNumberFieldProps) {
  const theme = useTheme();
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  return (
    <View className="flex-row items-start gap-2.5">
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={() => setIsPickerVisible(true)}
        className="h-[52px] flex-row items-center gap-1.5 rounded-control border-[1.5px] border-input-line bg-input px-3"
      >
        <Text className="ds-text-list-title text-ink">
          {`${country} ${dialCode}`}
        </Text>
        <Ionicons name="chevron-down" size={16} color={theme.ink2} />
      </TouchableOpacity>
      <View className="flex-1">
        <TextInput
          icon={null}
          accessibilityLabel={label}
          keyboardType="phone-pad"
          autoComplete="tel"
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          {...numberInput}
        />
      </View>

      <CountryPicker
        visible={isPickerVisible}
        onClose={() => setIsPickerVisible(false)}
        onSelect={onSelectCountry}
      />
    </View>
  );
}
