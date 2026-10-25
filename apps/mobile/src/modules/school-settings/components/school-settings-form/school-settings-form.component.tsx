import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PhoneNumberField } from "@/components/phone-number-field";
import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useTheme } from "@/hooks/use-theme";

import { usePinnedFooter } from "../../hooks/use-pinned-footer.hook";
import { useScrollToEndOnKeyboard } from "../../hooks/use-scroll-to-end-on-keyboard.hook";

import { useSchoolSettingsForm } from "./school-settings-form.hook";
import { SchoolSettingsFormProps } from "./school-settings-form.types";

const CONTENT_PADDING_TOP = 8;
// The Save button's height (52) and the space above it (12): the form scrolls clear of the pinned footer.
const FOOTER_CLEARANCE = 64;

/**
 * The intro, the waiting-list switch and the school's WhatsApp number, which scroll, and the Save button, which stays
 * at the bottom of the screen (above the keyboard).
 */
export function SchoolSettingsForm({
  settings,
  header,
}: SchoolSettingsFormProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const restingPaddingBottom = Math.max(insets.bottom, 24);
  const footerStyle = usePinnedFooter(restingPaddingBottom);
  const scrollRef = useScrollToEndOnKeyboard();
  const form = useSchoolSettingsForm({ settings });

  return (
    <>
      <Animated.ScrollView
        ref={scrollRef}
        className="flex-1 bg-page"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-6 px-screen"
        onScroll={header.scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: CONTENT_PADDING_TOP,
          paddingBottom: FOOTER_CLEARANCE + restingPaddingBottom + 24,
        }}
      >
        <ScreenIntro
          icon={
            <Ionicons name="settings-outline" size={30} color={theme.grape} />
          }
          title={t("schoolSettings.title")}
          description={t("schoolSettings.description")}
          onTitleLayout={header.onTitleBottomChange}
        />
        <View className="gap-2">
          <Text className="ds-text-section-label text-ink-2">
            {t("schoolSettings.waitingList.section")}
          </Text>
          <View className="gap-1 rounded-card border border-line bg-surface p-4">
            <View className="min-h-11 flex-row items-center gap-3">
              <Text className="ds-text-list-title flex-1 text-ink">
                {t("schoolSettings.waitingList.label")}
              </Text>
              {/* The iOS switch aligns itself to the start of the row unless told otherwise. */}
              <Switch
                accessibilityLabel={t("schoolSettings.waitingList.label")}
                value={form.waitingListEnabled}
                onValueChange={form.setWaitingListEnabled}
                trackColor={{ false: theme.line, true: theme.lagoon }}
                style={{ alignSelf: "center" }}
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
      </Animated.ScrollView>
      {header.backdrop}
      <Animated.View
        className="absolute inset-x-0 bottom-0 bg-page px-screen pt-3"
        style={footerStyle}
      >
        <Button
          disabled={!form.canSave}
          loading={form.isSaving}
          onPress={form.save}
        >
          {t("schoolSettings.save")}
        </Button>
      </Animated.View>
    </>
  );
}
