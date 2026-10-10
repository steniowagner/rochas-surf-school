import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { CountryPicker } from "../country-picker";

import { useWhatsapp } from "./whatsapp.hook";

export function Whatsapp() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    firstName,
    country,
    dialCode,
    numberField,
    canSubmit,
    isSaving,
    isHidden,
    setIsHidden,
    isPickerVisible,
    openPicker,
    closePicker,
    selectCountry,
    submit,
  } = useWhatsapp();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-page"
    >
      <View
        className="flex-1 px-[22px]"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <View className="mt-6 gap-6">
          <ScreenIntro
            icon={<Ionicons name="checkmark" size={30} color={theme.ok} />}
            iconTileClassName="bg-ok-tint"
            eyebrow={t("whatsapp.eyebrow")}
            eyebrowClassName="text-ok"
            title={t("whatsapp.title", { firstName })}
            description={t("whatsapp.description")}
          />

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
          {t("whatsapp.submit")}
        </Button>
      </View>

      <CountryPicker
        visible={isPickerVisible}
        onClose={closePicker}
        onSelect={selectCountry}
      />
    </KeyboardAvoidingView>
  );
}
