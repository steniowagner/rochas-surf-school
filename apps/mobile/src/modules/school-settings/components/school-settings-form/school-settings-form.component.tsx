import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";

import { PhoneNumberField } from "@/components/phone-number-field";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { useSchoolSettingsForm } from "./school-settings-form.hook";
import { SchoolSettingsFormProps } from "./school-settings-form.types";

/** The waiting-list switch and the school's WhatsApp number, saved together with one button. */
export function SchoolSettingsForm({ settings }: SchoolSettingsFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const form = useSchoolSettingsForm({ settings });

  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("schoolSettings.waitingList.section")}
        </Text>
        <View className="gap-1 rounded-card border border-line bg-surface p-4">
          <View className="min-h-11 flex-row items-center gap-3">
            <Text className="ds-text-list-title flex-1 text-ink">
              {t("schoolSettings.waitingList.label")}
            </Text>
            <Switch
              accessibilityLabel={t("schoolSettings.waitingList.label")}
              value={form.waitingListEnabled}
              onValueChange={form.setWaitingListEnabled}
              trackColor={{ false: theme.line, true: theme.lagoon }}
            />
          </View>
          <Text className="ds-text-list-subtitle text-ink-2">
            {form.waitingListEnabled
              ? t("schoolSettings.waitingList.on")
              : t("schoolSettings.waitingList.off")}
          </Text>
        </View>
      </View>

      <View className="gap-2">
        <Text className="ds-text-section-label text-ink-2">
          {t("schoolSettings.whatsapp.section")}
        </Text>
        <View className="gap-3.5 rounded-card border border-line bg-surface p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="logo-whatsapp" size={19} color={theme.ink2} />
            <Text className="ds-text-list-subtitle flex-1 text-ink-2">
              {t("schoolSettings.whatsapp.helper")}
            </Text>
          </View>
          <PhoneNumberField
            country={form.phone.country}
            dialCode={form.phone.dialCode}
            numberInput={form.phone.numberInput}
            onSelectCountry={form.phone.onSelectCountry}
            label={t("schoolSettings.whatsapp.section")}
            onSubmitEditing={form.save}
          />
        </View>
      </View>

      <Button
        disabled={!form.canSave}
        loading={form.isSaving}
        onPress={form.save}
      >
        {t("schoolSettings.save")}
      </Button>
    </View>
  );
}
