import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";
import { Chip } from "@/components/ui/chip";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { CancelClassSheet } from "../components/cancel-class-sheet";
import { ClassToolsSheet } from "../components/class-tools-sheet";
import { DeleteClassSheet } from "../components/delete-class-sheet";
import { LocationMapPreview } from "../components/location-map-preview";

import { useClassDetailsScreen } from "./class-details.screen.hook";
import type { ClassDetailsScreenProps } from "./class-details.screen.types";

export function ClassDetailsScreen({
  canEdit = false,
}: ClassDetailsScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const screen = useClassDetailsScreen({ canEdit });
  const { item } = screen;

  return (
    <>
      <ScrollView
        className="flex-1 bg-page"
        contentContainerClassName="gap-6 px-screen"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <View className="flex-row items-center gap-4">
          <BackButton />
          <Text
            accessibilityRole="header"
            className="ds-text-screen-title-with-back flex-1 text-ink"
          >
            {t("classDetails.title")}
          </Text>
          {screen.showTools ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("classDetails.tools")}
              activeOpacity={BUTTON_ACTIVE_OPACITY}
              onPress={screen.openTools}
              style={shadowStyle("iconButton", theme)}
              className="h-11 w-11 items-center justify-center rounded-full bg-surface"
            >
              <Ionicons name="construct-outline" size={20} color={theme.ink} />
            </TouchableOpacity>
          ) : null}
        </View>
        {screen.isLoading ? (
          <ActivityIndicator
            testID="class-details-loading"
            color={theme.grape}
          />
        ) : screen.isNotFound ? (
          <Text className="ds-text-body text-center text-ink-2">
            {t("classDetails.notFound")}
          </Text>
        ) : screen.isError ? (
          <View className="items-center gap-3">
            <Text className="ds-text-body text-center text-ink-2">
              {t("classDetails.loadError")}
            </Text>
            <Button variant="outline" onPress={screen.retry}>
              {t("classDetails.retry")}
            </Button>
          </View>
        ) : item ? (
          <>
            <View className="gap-3">
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  tone={item.discipline === "surf" ? "surf" : "skate"}
                  icon={
                    item.discipline === "surf"
                      ? "water-outline"
                      : "disc-outline"
                  }
                >
                  {t(`newClass.discipline.${item.discipline}`)}
                </Chip>
                <Chip tone="info">{t(`newClass.level.${item.level}`)}</Chip>
              </View>
              <Text className="ds-text-kpi text-ink">{screen.timeRange}</Text>
              <Text className="ds-text-list-subtitle text-ink-2">
                {screen.dateLine}
              </Text>
              {screen.cancellationDeadline ? (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="calendar-clear-outline" size={16} color={theme.ink2} />
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {t("classDetails.cancellationDeadline", { when: screen.cancellationDeadline })}
                  </Text>
                </View>
              ) : null}
            </View>
            {screen.showNoInstructor ? (
              <Pressable
                accessibilityRole="button"
                onPress={screen.edit}
                className="min-h-11 flex-row items-center gap-3 rounded-card bg-warn-tint p-4"
              >
                <Ionicons
                  name="person-remove-outline"
                  size={24}
                  color={theme.ink}
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.noInstructor.title")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {t("classDetails.noInstructor.description")}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            {screen.showNoDeadline ? (
              <Pressable
                accessibilityRole="button"
                onPress={screen.openCancellationRules}
                className="min-h-11 flex-row items-center gap-3 rounded-card bg-warn-tint p-4"
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={24}
                  color={theme.ink}
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.noDeadline.title")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {t("classDetails.noDeadline.description", {
                      discipline: t(
                        `cancellationRules.screen.discipline.${item.discipline}`,
                      ),
                    })}
                  </Text>
                </View>
              </Pressable>
            ) : null}
            {screen.state === "started" ? (
              <View className="gap-1 rounded-card bg-sun p-4">
                <Text className="ds-text-list-title text-on-color">
                  {t("classDetails.started.title")}
                </Text>
                <Text className="ds-text-list-subtitle text-on-color">
                  {t("classDetails.started.description", {
                    start: screen.start,
                    end: screen.end,
                  })}
                </Text>
              </View>
            ) : null}
            {screen.state === "cancelled" ? (
              <View className="flex-row items-center gap-3 rounded-card bg-bad-tint p-4">
                <Ionicons
                  name="close-circle-outline"
                  size={24}
                  color={theme.bad}
                />
                <View className="flex-1 gap-1">
                  <Text className="ds-text-list-title text-ink">
                    {t("classDetails.cancelled.title")}
                  </Text>
                  <Text className="ds-text-list-subtitle text-ink-2">
                    {item.cancellationMessage ??
                      t("classDetails.cancelled.description")}
                  </Text>
                </View>
              </View>
            ) : null}
            {screen.state === "finished" ? (
              <View className="gap-1 rounded-card bg-dim p-4">
                <Text className="ds-text-list-title text-ink">
                  {t("classDetails.finished.title")}
                </Text>
                <Text className="ds-text-list-subtitle text-ink-2">
                  {t("classDetails.finished.description", { end: screen.end })}
                </Text>
              </View>
            ) : null}
            <View className="gap-2">
              <Text className="ds-text-section-label text-ink-2">
                {t("classDetails.instructor", {
                  count: screen.instructors.length,
                })}
              </Text>
              {screen.instructors.length === 0 ? (
                <Text className="ds-text-body text-ink-2">
                  {t("classDetails.noInstructorAssigned")}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap gap-2">
                {screen.instructors.map((instructor) => (
                  <View
                    key={instructor.id}
                    className="flex-row items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3"
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-sand">
                      <Text className="ds-text-chip text-ink">
                        {instructor.initials}
                      </Text>
                    </View>
                    <Text className="ds-text-list-title text-ink">
                      {instructor.isViewer
                        ? t("classDetails.you")
                        : instructor.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons name="people-outline" size={18} color={theme.ink2} />
              <Text className="ds-text-body text-ink">
                {t("classDetails.capacity", { count: item.capacity })}
              </Text>
            </View>
            {item.notes ? (
              <View className="gap-2">
                <Text className="ds-text-section-label text-ink-2">
                  {t("classDetails.notes")}
                </Text>
                <Text className="ds-text-body text-ink">{item.notes}</Text>
              </View>
            ) : null}
            <View className="gap-2">
              <Text className="ds-text-section-label text-ink-2">
                {t("classDetails.location")}
              </Text>
              <View className="gap-1 rounded-card border border-line bg-surface p-4">
                <Text className="ds-text-list-title text-ink">
                  {item.location.name}
                </Text>
                <Text className="ds-text-list-subtitle text-ink-2">
                  {item.location.address}
                </Text>
                {screen.locationPoint ? (
                  <View className="pt-2">
                    <LocationMapPreview point={screen.locationPoint} />
                  </View>
                ) : null}
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
      <ClassToolsSheet
        visible={screen.toolsVisible}
        onClose={screen.closeTools}
        onEdit={screen.edit}
        onCancel={screen.openCancel}
        onDelete={screen.openDelete}
        canDelete={screen.canDelete}
      />
      <DeleteClassSheet
        visible={screen.deleteVisible}
        variant={screen.deleteVariant}
        classLine={screen.classLine}
        loading={screen.deleting}
        onConfirm={screen.remove}
        onCancelInstead={screen.cancelInstead}
        onClose={screen.closeDelete}
      />
      <CancelClassSheet
        visible={screen.cancelVisible}
        loading={screen.cancelling}
        onConfirm={screen.cancel}
        onClose={screen.closeCancel}
      />
    </>
  );
}
