import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Switch, Text, TouchableOpacity, View } from "react-native";

import { CountryPicker } from "@/components/country-picker";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { useWhatsappNumberForm } from "./whatsapp-number-form.hook";
import { WhatsappNumberFormProps } from "./whatsapp-number-form.types";

/** The WhatsApp number card (country, masked number, hide switch) and the submit button below it. */
export function WhatsappNumberForm({
  header,
  initialNumber,
  initialVisible,
  requireChange,
  submitLabel,
  isSaving,
  onSubmit,
}: WhatsappNumberFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    country,
    dialCode,
    numberField,
    canSubmit,
    isHidden,
    setIsHidden,
    isPickerVisible,
    openPicker,
    closePicker,
    selectCountry,
    submit,
  } = useWhatsappNumberForm({
    initialNumber,
    initialVisible,
    requireChange,
    isSaving,
    onSubmit,
  });

  return (
    <View className="flex-1">
      <View className="mt-6 gap-6">
        {header}

        <View className="gap-3.5 rounded-card border border-line bg-surface p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="logo-whatsapp" size={19} color={theme.ink2} />
            <Text className="ds-text-section-label text-ink-2">
              {t("whatsapp.cardTitle")}
            </Text>
          </View>

          <View className="flex-row items-start gap-2.5">
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              onPress={openPicker}
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
                accessibilityLabel={t("whatsapp.cardTitle")}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="done"
                onSubmitEditing={submit}
                {...numberField}
              />
            </View>
          </View>

          <Text className="ds-text-list-subtitle text-ink-2">
            {t("whatsapp.helper")}
          </Text>

          <View className="h-px bg-line" />

          <View className="min-h-11 flex-row items-center gap-3">
            <Ionicons name="eye-off-outline" size={20} color={theme.ink2} />
            <View className="flex-1 gap-0.5">
              <Text className="ds-text-list-title text-ink">
                {t("whatsapp.hideNumber")}
              </Text>
              <Text className="ds-text-list-subtitle text-ink-2">
                {t("whatsapp.hideNumberHint")}
              </Text>
            </View>
            <Switch
              accessibilityLabel={t("whatsapp.hideNumber")}
              value={isHidden}
              onValueChange={setIsHidden}
              trackColor={{ false: theme.line, true: theme.lagoon }}
            />
          </View>
        </View>
      </View>

      <View className="min-h-6 flex-1" />

      <Button disabled={!canSubmit} loading={isSaving} onPress={submit}>
        {submitLabel}
      </Button>

      <CountryPicker
        visible={isPickerVisible}
        onClose={closePicker}
        onSelect={selectCountry}
      />
    </View>
  );
}
