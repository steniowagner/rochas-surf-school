import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { iconSizes } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { ErrorStateProps } from "./error-state.types";

/** A failed fetch that leaves the screen with nothing to show: fills the space under the header. */
export function ErrorState({
  title,
  description,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-9 pb-10">
      <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-bad-tint">
        <Ionicons
          name="alert-circle-outline"
          size={iconSizes.errorState}
          color={theme.bad}
        />
      </View>
      <Text
        accessibilityRole="header"
        className="ds-text-sheet-title mt-6 text-center text-ink"
      >
        {title}
      </Text>
      <Text className="ds-text-body mt-2.5 max-w-72 text-center text-ink-2">
        {description}
      </Text>
      <Button
        variant="ink"
        className="mt-7 self-stretch"
        loading={retrying}
        icon={
          <Ionicons name="refresh" size={iconSizes.button} color={theme.page} />
        }
        onPress={onRetry}
      >
        {t("common.tryAgain")}
      </Button>
    </View>
  );
}
