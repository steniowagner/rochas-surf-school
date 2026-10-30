import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";
import { PersonSheet } from "@/modules/people/components/person-sheet";
import { usePinnedFooter } from "@/modules/school-settings/hooks/use-pinned-footer.hook";
import { useCollapsingTitleHeader } from "@/navigation/stack-header";

import { ClassMessageCard } from "../components/class-message-card";
import { SendNoticeConfirmSheet } from "../components/send-notice-confirm-sheet";
import { useScrollFieldIntoView } from "../hooks/use-scroll-field-into-view.hook";
import {
  NOTICE_AUDIENCES,
  NOTICE_MESSAGE_MAX_LENGTH,
  NOTICE_TITLE_MAX_LENGTH,
} from "../notices.constants";

import { useSendNoticeScreen } from "./send-notice.screen.hook";

const CONTENT_PADDING_TOP = 8;
// The Send button's height (52) and the space above it (12): the form scrolls clear of the pinned footer.
const FOOTER_CLEARANCE = 64;

/**
 * An admin writes a notice, picks who gets it, sees how many people that is and confirms it (PAINEL-07, PAINEL-07A).
 * Opened from a class's tools with its id, the same screen writes a message to that class: the class and its people
 * take the audience picker's place (spec 069). The form scrolls under a collapsing title and the Send button stays at
 * the bottom, above the keyboard.
 */
export function SendNoticeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const restingPaddingBottom = Math.max(insets.bottom, 24);
  const footerStyle = usePinnedFooter(restingPaddingBottom);
  const screen = useSendNoticeScreen();
  const copy = screen.isClassMode ? "notices.classMessage" : "notices";
  const header = useCollapsingTitleHeader({
    title: t(`${copy}.title`),
    contentTop: CONTENT_PADDING_TOP,
  });
  const { scrollRef, onFieldLayout, onFieldFocus } = useScrollFieldIntoView();

  const audienceOptions = NOTICE_AUDIENCES.map((value) => ({
    value,
    label: t(`notices.audience.${value}`),
  }));

  const countText = screen.isCountError
    ? t(
        screen.isClassMode
          ? "notices.classMessage.count.error"
          : "notices.count.error",
      )
    : screen.count === undefined
      ? t(
          screen.isClassMode
            ? "notices.classMessage.count.loading"
            : "notices.count.loading",
        )
      : screen.count === 0
        ? t("notices.count.none")
        : t("notices.count.people", { count: screen.count });

  return (
    <>
      <Stack.Screen options={header.headerOptions} />
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
            <Ionicons
              name={
                screen.isClassMode ? "chatbubble-outline" : "megaphone-outline"
              }
              size={30}
              color={theme.grape}
            />
          }
          title={t(`${copy}.title`)}
          description={t(`${copy}.description`)}
          onTitleLayout={header.onTitleBottomChange}
        />
        <View className="gap-2">
          {screen.isClassMode ? null : (
            <Text className="ds-text-section-label text-ink-2">
              {t("notices.audience.section")}
            </Text>
          )}
          {screen.isClassMode ? (
            screen.classView ? (
              <ClassMessageCard
                view={screen.classView}
                onOpenPerson={screen.openPerson}
              />
            ) : null
          ) : (
            <SegmentedControl
              options={audienceOptions}
              value={screen.audience}
              onChange={screen.setAudience}
            />
          )}
          {screen.isClassMode &&
          screen.classView &&
          screen.count !== 0 ? null : (
            <View className="flex-row items-center gap-1.5 px-1">
              <Ionicons name="people-outline" size={14} color={theme.ink2} />
              <Text
                accessibilityLiveRegion="polite"
                testID="notice-recipients-count"
                className="ds-text-list-subtitle flex-1 text-ink-2"
              >
                {countText}
              </Text>
            </View>
          )}
        </View>
        <View
          testID="notice-title-field"
          className="gap-2"
          onLayout={(event) => onFieldLayout("title", event)}
        >
          <Text className="ds-text-section-label text-ink-2">
            {t("notices.titleLabel")}
          </Text>
          <TextInput
            icon={null}
            accessibilityLabel={t("notices.titleLabel")}
            placeholder={t("notices.titlePlaceholder")}
            value={screen.title}
            maxLength={NOTICE_TITLE_MAX_LENGTH}
            onChangeText={screen.setTitle}
            onFocus={() => onFieldFocus("title")}
          />
        </View>
        <View
          testID="notice-message-field"
          className="gap-2"
          onLayout={(event) => onFieldLayout("message", event)}
        >
          <Text className="ds-text-section-label text-ink-2">
            {t("notices.messageLabel")}
          </Text>
          <TextArea
            accessibilityLabel={t("notices.messageLabel")}
            placeholder={t("notices.messagePlaceholder")}
            value={screen.message}
            maxLength={NOTICE_MESSAGE_MAX_LENGTH}
            onChangeText={screen.setMessage}
            onFocus={() => onFieldFocus("message")}
          />
        </View>
      </Animated.ScrollView>
      {header.backdrop}
      <Animated.View
        className="absolute inset-x-0 bottom-0 bg-page px-screen pt-3"
        style={footerStyle}
      >
        <Button disabled={!screen.canSend} onPress={screen.askToConfirm}>
          {t("notices.send")}
        </Button>
      </Animated.View>
      <PersonSheet
        person={screen.selectedPerson}
        visible={screen.personVisible}
        onClose={screen.closePerson}
      />
      <SendNoticeConfirmSheet
        visible={screen.isConfirming}
        classSummary={screen.classView}
        description={screen.confirmDescription}
        count={screen.count ?? 0}
        title={screen.title.trim()}
        message={screen.message.trim()}
        sending={screen.isSending}
        onConfirm={screen.confirm}
        onClose={screen.closeConfirm}
      />
    </>
  );
}
