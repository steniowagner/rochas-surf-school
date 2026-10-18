import { useTranslation } from "react-i18next";
import { ActivityIndicator, Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/hooks/use-theme";

import { useCancellationRulesSheet } from "./cancellation-rules-sheet.hook";
import { CancellationRulesSheetProps } from "./cancellation-rules-sheet.types";

const DISCIPLINES = ["surf", "skate"] as const;

/** Both cancellation rules, as the school wrote them. The same for every role. */
export function CancellationRulesSheet({ visible, onClose }: CancellationRulesSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { status, rules, retry } = useCancellationRulesSheet({ visible });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="gap-4 px-[22px] pb-6">
        <Text className="ds-text-screen-title text-ink">{t("cancellationRules.sheet.title")}</Text>
        {status === "loading" ? (
          <View className="items-center py-8">
            <ActivityIndicator color={theme.grape} />
          </View>
        ) : null}
        {status === "error" ? (
          <View className="items-center gap-3 py-6">
            <Text className="ds-text-body text-center text-ink-2">
              {t("cancellationRules.sheet.loadError")}
            </Text>
            <Button variant="subtle" onPress={retry}>
              {t("cancellationRules.sheet.retry")}
            </Button>
          </View>
        ) : null}
        {status === "ready" && rules
          ? DISCIPLINES.map((discipline) => (
              <View
                key={discipline}
                className="gap-2 rounded-card border border-line bg-surface p-4"
              >
                <View className="flex-row">
                  <Chip
                    tone={discipline}
                    icon={discipline === "surf" ? "water-outline" : "disc-outline"}
                  >
                    {t(`newClass.discipline.${discipline}`)}
                  </Chip>
                </View>
                <Text className="ds-text-body text-ink">
                  {rules[discipline] ?? t("cancellationRules.sheet.empty")}
                </Text>
              </View>
            ))
          : null}
        <Button variant="ghost" onPress={onClose}>
          {t("cancellationRules.sheet.close")}
        </Button>
      </View>
    </BottomModal>
  );
}
