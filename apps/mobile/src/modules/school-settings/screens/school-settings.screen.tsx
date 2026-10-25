import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorState } from "@/components/ui/error-state";
import { useSchoolSettings } from "@/hooks/use-school-settings.hook";
import {
  StackHeaderTitle,
  useCollapsingTitleHeader,
  useHeaderInset,
} from "@/navigation/stack-header";

import { SchoolSettingsForm } from "../components/school-settings-form";
import { SchoolSettingsSkeleton } from "../components/school-settings-skeleton";

const CONTENT_PADDING_TOP = 8;

/**
 * The school's settings for admins. The form scrolls under a collapsing title with the intro and the Save button
 * stays at the bottom; the loading and error states don't scroll and keep the title in the header. There is no empty state: the settings always exist.
 */
export function SchoolSettingsScreen() {
  const { t } = useTranslation();
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
          <SchoolSettingsForm settings={data} header={header} />
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
