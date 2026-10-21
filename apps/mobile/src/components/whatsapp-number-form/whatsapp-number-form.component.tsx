import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";

import { PhoneNumberField } from "@/components/phone-number-field";
import { Button } from "@/components/ui/button";
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
  const { phone, canSubmit, isHidden, setIsHidden, submit } =
    useWhatsappNumberForm({
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

          <PhoneNumberField
            country={phone.country}
            dialCode={phone.dialCode}
            numberInput={phone.numberInput}
            onSelectCountry={phone.onSelectCountry}
            label={t("whatsapp.cardTitle")}
            onSubmitEditing={submit}
          />

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
    </View>
  );
}
