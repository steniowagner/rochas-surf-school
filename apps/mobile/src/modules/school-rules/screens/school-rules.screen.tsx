import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import { useCollapsingTitleHeader } from "@/navigation/stack-header";

import { SchoolRuleRow } from "../components/school-rule-row";

import { useSchoolRulesReadScreen } from "./school-rules.screen.hook";

const LOADING_ROWS = [0, 1, 2];
const CONTENT_PADDING_TOP = 8;

/** The school rules to read at any time: no checkbox and no button, only the back button. */
export function SchoolRulesReadScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useSchoolRulesReadScreen();
  const header = useCollapsingTitleHeader({
    title: t("schoolRulesScreen.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <>
      <Stack.Screen options={header.headerOptions} />
      <Animated.ScrollView
        testID="school-rules-read"
        className="flex-1 bg-page"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-screen"
        onScroll={header.scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: CONTENT_PADDING_TOP,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <ScreenIntro
          icon={
            <Ionicons name="shield-outline" size={28} color={theme.grape} />
          }
          title={t("schoolRulesScreen.title")}
          description={t("schoolRulesScreen.description")}
          onTitleLayout={header.onTitleBottomChange}
        />
        {screen.status === "loading" ? (
          // Rows shaped like rules, read out as one loading state.
          <View
            testID="school-rules-loading"
            accessible
            accessibilityLabel={t("schoolRulesScreen.loading")}
            className="rounded-card border border-line bg-surface"
          >
            {LOADING_ROWS.map((key) => (
              <View
                key={key}
                className={`flex-row gap-3 px-4 py-3.5 ${key < LOADING_ROWS.length - 1 ? "border-b border-line" : ""}`}
              >
                <Skeleton className="h-[22px] w-7 rounded-full" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-3.5 w-1/2 rounded-full" />
                  <Skeleton className="h-3 w-5/6 rounded-full" />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {screen.status === "error" ? (
          <View className="flex-row pt-4">
            <ErrorState
              title={t("schoolRulesScreen.loadError.title")}
              description={t("schoolRulesScreen.loadError.description")}
              onRetry={screen.retry}
              retrying={screen.retrying}
            />
          </View>
        ) : null}
        {screen.status === "empty" ? (
          <View className="flex-row pt-4">
            <EmptyState
              icon="shield-outline"
              title={t("schoolRulesScreen.empty.title")}
              description={t("schoolRulesScreen.empty.description")}
            />
          </View>
        ) : null}
        {screen.status === "ready" ? (
          <View className="rounded-card border border-line bg-surface px-4">
            {screen.rules.map((rule, index) => (
              <SchoolRuleRow
                key={rule.id}
                rule={rule}
                position={index + 1}
                showDivider={index < screen.rules.length - 1}
              />
            ))}
          </View>
        ) : null}
      </Animated.ScrollView>
    </>
  );
}
