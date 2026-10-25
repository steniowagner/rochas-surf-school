import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
  useHeaderInset,
} from "@/navigation/stack-header";

import { CancellationRulesSkeleton } from "../components/cancellation-rules-skeleton";
import { CANCELLATION_RULE_TEXT_MAX } from "../cancellation-rules.constants";

import { useCancellationRulesScreen } from "./cancellation-rules.screen.hook";

const CONTENT_PADDING_TOP = 8;

/**
 * The cancellation rule of each discipline, written by the admins. The form scrolls under a collapsing title with the
 * intro; the loading and error states don't scroll and keep the title in the header. A discipline with no rule isn't
 * an empty state: it is the form with a blank text.
 */
export function CancellationRulesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const screen = useCancellationRulesScreen();
  const disciplineName = t(
    `cancellationRules.screen.discipline.${screen.discipline}`,
  );
  const header = useCollapsingTitleHeader({
    title: t("cancellationRules.screen.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <>
      {screen.status === "ready" ? (
        <>
          <Stack.Screen options={header.headerOptions} />
          <Animated.ScrollView
            className="flex-1 bg-page"
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="automatic"
            contentContainerClassName="gap-6 px-screen"
            onScroll={header.scrollHandler}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: CONTENT_PADDING_TOP,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            <ScreenIntro
              icon={
                <Ionicons
                  name="document-text-outline"
                  size={30}
                  color={theme.grape}
                />
              }
              title={t("cancellationRules.screen.title")}
              description={t("cancellationRules.screen.intro")}
              onTitleLayout={header.onTitleBottomChange}
            />
            <SegmentedControl
              options={[
                { value: "surf", label: t("newClass.discipline.surf") },
                { value: "skate", label: t("newClass.discipline.skate") },
              ]}
              value={screen.discipline}
              onChange={screen.setDiscipline}
            />
            <View className="gap-3 rounded-card bg-dim p-4">
              <View className="flex-row items-start gap-3">
                <Ionicons name="time-outline" size={18} color={theme.lagoon} />
                <Text className="ds-text-body flex-1 text-ink-2">
                  {t("cancellationRules.screen.tipTime")}
                </Text>
              </View>
              <View className="flex-row items-start gap-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={theme.lagoon}
                />
                <Text className="ds-text-body flex-1 text-ink-2">
                  {t("cancellationRules.screen.tipAmbiguity")}
                </Text>
              </View>
            </View>
            <View className="gap-1.5">
              <TextArea
                label={t(`newClass.discipline.${screen.discipline}`)}
                value={screen.value}
                onChangeText={screen.setValue}
                maxLength={CANCELLATION_RULE_TEXT_MAX}
                placeholder={t("cancellationRules.screen.placeholder")}
              />
              <Text className="ds-text-list-subtitle px-1 text-ink-2">
                {screen.note === "unsaved"
                  ? t("cancellationRules.screen.note.unsaved")
                  : t(`cancellationRules.screen.note.${screen.note}`, {
                      discipline: disciplineName,
                    })}
              </Text>
            </View>
            <Button
              disabled={!screen.canSave}
              loading={screen.isSaving}
              onPress={screen.save}
            >
              {t("cancellationRules.screen.save", {
                discipline: disciplineName,
              })}
            </Button>
          </Animated.ScrollView>
          {header.backdrop}
        </>
      ) : (
        <>
          <Stack.Screen
            options={{
              headerTitle: () => (
                <StackHeaderTitle title={t("cancellationRules.screen.title")} />
              ),
            }}
          />
          <View
            className={`flex-1 bg-page px-screen ${screen.status === "loading" ? "" : "justify-center"}`}
            style={{
              paddingTop: headerInset + CONTENT_PADDING_TOP,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {screen.status === "loading" ? <CancellationRulesSkeleton /> : null}
            {screen.status === "error" ? (
              <View className="flex-row">
                <ErrorState
                  title={t("cancellationRules.screen.loadError.title")}
                  description={t(
                    "cancellationRules.screen.loadError.description",
                  )}
                  onRetry={screen.retry}
                  retrying={screen.isRetrying}
                />
              </View>
            ) : null}
          </View>
        </>
      )}
    </>
  );
}
