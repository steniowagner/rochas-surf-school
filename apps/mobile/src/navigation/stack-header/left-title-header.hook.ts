import { router } from "expo-router";
import type { ComponentProps, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

import type { Stack } from "expo-router";

type ScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack.Screen>["options"]>,
  (...args: never[]) => unknown
>;

/**
 * Options that put a screen's title at the left of the native header. iOS always centers `headerTitle`, so there
 * the title is a left item; left items replace the native back button, so it is drawn here when the screen was
 * pushed. Elsewhere `headerTitle` is used with a left alignment.
 */
export const useLeftTitleHeader = (
  renderTitle: () => ReactElement,
): ScreenOptions => {
  const { t } = useTranslation();

  return {
    headerTitleAlign: "left",
    headerTitle: Platform.OS === "ios" ? "" : renderTitle,
    unstable_headerLeftItems: ({ canGoBack }) => [
      ...(canGoBack
        ? [
            {
              type: "button" as const,
              label: t("common.back"),
              icon: {
                type: "sfSymbol" as const,
                name: "chevron.backward" as const,
              },
              onPress: () => router.back(),
            },
          ]
        : []),
      {
        type: "custom" as const,
        element: renderTitle(),
        hidesSharedBackground: true,
      },
    ],
  };
};
