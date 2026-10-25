import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { Skeleton } from "@/components/ui/skeleton";
import { iconSizes } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useCollapsingTitleHeader } from "@/navigation/stack-header";

import { DeleteSchoolRuleSheet } from "../components/delete-school-rule-sheet";
import { SchoolRuleEditableRow } from "../components/school-rule-editable-row";
import { SchoolRuleSheet } from "../components/school-rule-sheet";

import { useManageSchoolRulesScreen } from "./manage-school-rules.screen.hook";

const LOADING_ROWS = [0, 1, 2];
const CONTENT_PADDING_TOP = 8;

/**
 * "Regras da escola" for admins: the rules in the order students see them, each opened to edit or delete and moved
 * with ↑ / ↓, and "Adicionar regra". Every add, edit or delete asks everyone to accept the rules again (spec 056).
 */
export function ManageSchoolRulesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useManageSchoolRulesScreen();
  const header = useCollapsingTitleHeader({
    title: t("manageSchoolRules.title"),
    contentTop: CONTENT_PADDING_TOP,
  });

  return (
    <>
      <Stack.Screen options={header.headerOptions} />
      <Animated.ScrollView
        testID="manage-school-rules"
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
          title={t("manageSchoolRules.title")}
          description={t("manageSchoolRules.intro")}
          onTitleLayout={header.onTitleBottomChange}
        />
        {screen.status === "loading" ? (
          // Rows shaped like rules, read out as one loading state.
          <View
            testID="school-rules-loading"
            accessible
            accessibilityLabel={t("manageSchoolRules.loading")}
            className="rounded-card border border-line bg-surface"
          >
            {LOADING_ROWS.map((key) => (
              <View
                key={key}
                className={`flex-row items-start gap-3 px-4 py-3.5 ${key < LOADING_ROWS.length - 1 ? "border-b border-line" : ""}`}
              >
                <Skeleton className="h-[22px] w-7 rounded-full" />
                <View className="flex-1 gap-2">
                  <Skeleton className="h-3.5 w-1/2 rounded-full" />
                  <Skeleton className="h-3 w-5/6 rounded-full" />
                </View>
                <View className="gap-2">
                  <Skeleton className="h-9 w-9 rounded-icon-button" />
                  <Skeleton className="h-9 w-9 rounded-icon-button" />
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {screen.status === "error" ? (
          <View className="flex-row pt-4">
            <ErrorState
              title={t("manageSchoolRules.loadError.title")}
              description={t("manageSchoolRules.loadError.description")}
              onRetry={screen.retry}
              retrying={screen.retrying}
            />
          </View>
        ) : null}
        {screen.status === "empty" ? (
          <View className="flex-row pt-4">
            <EmptyState
              icon="shield-outline"
              title={t("manageSchoolRules.empty.title")}
              description={t("manageSchoolRules.empty.description")}
              action={{
                label: t("manageSchoolRules.add"),
                icon: "add",
                onPress: screen.openAdd,
              }}
            />
          </View>
        ) : null}
        {screen.status === "ready" ? (
          <>
            <View className="rounded-card border border-line bg-surface">
              {screen.rules.map((rule, index) => (
                <SchoolRuleEditableRow
                  key={rule.id}
                  rule={rule}
                  position={index + 1}
                  showDivider={index < screen.rules.length - 1}
                  moveUpDisabled={index === 0 || screen.reordering}
                  moveDownDisabled={
                    index === screen.rules.length - 1 || screen.reordering
                  }
                  onEdit={() => screen.openEdit(rule)}
                  onMoveUp={() => screen.moveUp(index)}
                  onMoveDown={() => screen.moveDown(index)}
                />
              ))}
            </View>
            <Button
              variant="outline"
              icon={
                <Ionicons
                  name="add"
                  size={iconSizes.button}
                  color={theme.ink}
                />
              }
              onPress={screen.openAdd}
            >
              {t("manageSchoolRules.add")}
            </Button>
          </>
        ) : null}
      </Animated.ScrollView>
      {header.backdrop}
      <SchoolRuleSheet
        visible={screen.ruleSheetVisible}
        mode={screen.ruleSheet.mode}
        rule={screen.ruleSheet.rule}
        onClose={screen.closeRuleSheet}
        onDelete={screen.openDelete}
      />
      <DeleteSchoolRuleSheet
        visible={screen.deleteSheetVisible}
        rule={screen.ruleToDelete}
        onClose={screen.closeDeleteSheet}
      />
    </>
  );
}
