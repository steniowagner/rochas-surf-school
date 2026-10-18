import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TextArea } from "@/components/ui/text-area";
import { useTheme } from "@/hooks/use-theme";

import { CANCELLATION_RULE_TEXT_MAX } from "../cancellation-rules.constants";

import { useCancellationRulesScreen } from "./cancellation-rules.screen.hook";

export function CancellationRulesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useCancellationRulesScreen();
  const disciplineName = t(`cancellationRules.screen.discipline.${screen.discipline}`);

  return (
    <ScrollView
      className="flex-1 bg-page"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-6 px-screen"
      contentContainerStyle={{
        paddingBottom: Math.max(insets.bottom, 24),
      }}
    >
      <ScreenIntro
        icon={<Ionicons name="document-text-outline" size={30} color={theme.grape} />}
        title={t("cancellationRules.screen.title")}
        description={t("cancellationRules.screen.intro")}
      />
      {screen.status === "loading" ? (
        <View className="items-center py-8">
          <ActivityIndicator color={theme.grape} />
        </View>
      ) : null}
      {screen.status === "error" ? (
        <View className="items-center gap-3 py-6">
          <Text className="ds-text-body text-center text-ink-2">
            {t("cancellationRules.screen.loadError")}
          </Text>
          <Button variant="subtle" onPress={screen.retry}>
            {t("cancellationRules.screen.retry")}
          </Button>
        </View>
      ) : null}
      {screen.status === "ready" ? (
        <>
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
              <Ionicons name="alert-circle-outline" size={18} color={theme.lagoon} />
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
                : t(`cancellationRules.screen.note.${screen.note}`, { discipline: disciplineName })}
            </Text>
          </View>
          <Button disabled={!screen.canSave} loading={screen.isSaving} onPress={screen.save}>
            {t("cancellationRules.screen.save", { discipline: disciplineName })}
          </Button>
        </>
      ) : null}
    </ScrollView>
  );
}
