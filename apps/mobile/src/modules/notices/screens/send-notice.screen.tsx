import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";
import { StackHeaderTitle, useHeaderInset } from "@/navigation/stack-header";

import { SendNoticeConfirmSheet } from "../components/send-notice-confirm-sheet";
import {
  NOTICE_AUDIENCES,
  NOTICE_MESSAGE_MAX_LENGTH,
  NOTICE_TITLE_MAX_LENGTH,
} from "../notices.constants";

import { useSendNoticeScreen } from "./send-notice.screen.hook";

/** An admin writes a notice, picks who gets it, sees how many people that is and confirms it (PAINEL-07, PAINEL-07A). */
export function SendNoticeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const screen = useSendNoticeScreen();

  const audienceOptions = NOTICE_AUDIENCES.map((value) => ({
    value,
    label: t(`notices.audience.${value}`),
  }));

  const countText = screen.isCountError
    ? t("notices.count.error")
    : screen.count === undefined
      ? t("notices.count.loading")
      : screen.count === 0
        ? t("notices.count.none")
        : t("notices.count.people", { count: screen.count });

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <StackHeaderTitle title={t("notices.title")} />,
        }}
      />
      <ScrollView
        className="flex-1 bg-page"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 px-screen"
        contentContainerStyle={{
          paddingTop: headerInset + 8,
          paddingBottom: Math.max(insets.bottom, 24) + 24,
        }}
      >
        <ScreenIntro
          icon={<Ionicons name="megaphone-outline" size={30} color={theme.grape} />}
          title={t("notices.title")}
          description={t("notices.description")}
        />
        <View className="gap-2">
          <Text className="ds-text-section-label text-ink-2">
            {t("notices.audience.section")}
          </Text>
          <SegmentedControl
            options={audienceOptions}
            value={screen.audience}
            onChange={screen.setAudience}
          />
          <Text
            accessibilityLiveRegion="polite"
            testID="notice-recipients-count"
            className="ds-text-list-subtitle px-1 text-ink-2"
          >
            {countText}
          </Text>
        </View>
        <View className="gap-4">
          <TextInput
            icon={<Ionicons name="text-outline" size={19} color={theme.ink2} />}
            accessibilityLabel={t("notices.titleLabel")}
            placeholder={t("notices.titleLabel")}
            value={screen.title}
            maxLength={NOTICE_TITLE_MAX_LENGTH}
            onChangeText={screen.setTitle}
          />
          <TextArea
            label={t("notices.messageLabel")}
            placeholder={t("notices.messagePlaceholder")}
            value={screen.message}
            maxLength={NOTICE_MESSAGE_MAX_LENGTH}
            onChangeText={screen.setMessage}
          />
        </View>
        <Button disabled={!screen.canSend} onPress={screen.askToConfirm}>
          {t("notices.send")}
        </Button>
      </ScrollView>
      <SendNoticeConfirmSheet
        visible={screen.isConfirming}
        audience={screen.audience}
        count={screen.count ?? 0}
        sending={screen.isSending}
        onConfirm={screen.confirm}
        onClose={screen.closeConfirm}
      />
    </>
  );
}
