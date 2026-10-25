import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { useSchoolSettings } from "@/hooks/use-school-settings.hook";
import { useTheme } from "@/hooks/use-theme";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
  useHeaderInset,
} from "@/navigation/stack-header";

import { SchoolSettingsForm } from "../components/school-settings-form";
import { SchoolSettingsSkeleton } from "../components/school-settings-skeleton";

const CONTENT_PADDING_TOP = 8;

/**
 * The school's settings for admins. The form scrolls under a collapsing title with the intro; the loading and error
 * states don't scroll and keep the title in the header. There is no empty state: the settings always exist.
 */
export function SchoolSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const { data, isError, isFetching, refetch } = useSchoolSettings();
  const header = useCollapsingTitleHeader({
    title: t("schoolSettings.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <>
      {data ? (
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
                  name="settings-outline"
                  size={30}
                  color={theme.grape}
                />
              }
              title={t("schoolSettings.title")}
              description={null}
              onTitleLayout={header.onTitleBottomChange}
            />
            <SchoolSettingsForm settings={data} />
          </Animated.ScrollView>
          {header.backdrop}
        </>
      ) : (
        <>
          <Stack.Screen
            options={{
              headerTitle: () => (
                <StackHeaderTitle title={t("schoolSettings.title")} />
              ),
            }}
          />
          <View
            className={`flex-1 bg-page px-screen ${isError ? "justify-center" : ""}`}
            style={{
              paddingTop: headerInset + CONTENT_PADDING_TOP,
              paddingBottom: Math.max(insets.bottom, 24),
            }}
          >
            {isError ? (
              <View className="flex-row">
                <ErrorState
                  title={t("schoolSettings.loadError.title")}
                  description={t("schoolSettings.loadError.description")}
                  onRetry={() => void refetch()}
                  retrying={isFetching}
                />
              </View>
            ) : (
              <SchoolSettingsSkeleton />
            )}
          </View>
        </>
      )}
    </>
  );
}
