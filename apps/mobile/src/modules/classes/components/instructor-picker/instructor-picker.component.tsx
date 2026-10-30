import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { PersonAvatar } from "@/modules/people/components/person-avatar";

import { InstructorPickerProps } from "./instructor-picker.types";

/** Every approved instructor and admin as a row to tick; the ticked ones teach the batch. */
export function InstructorPicker({
  teachers,
  loading,
  error,
  selectedIds,
  onToggle,
  onRetry,
}: InstructorPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  if (loading) {
    return (
      <View testID="instructors-loading" className="items-center py-6">
        <ActivityIndicator color={theme.grape} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="items-center gap-3 py-4">
        <Text className="ds-text-body text-center text-ink-2">
          {t("newClass.instructors.loadError")}
        </Text>
        <Button variant="outline" onPress={onRetry}>
          {t("registrations.retry")}
        </Button>
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-card border border-line bg-surface">
      {teachers.map((teacher, index) => {
        const checked = selectedIds.includes(teacher.id);

        return (
          <Pressable
            key={teacher.id}
            accessibilityRole="checkbox"
            accessibilityLabel={teacher.name}
            accessibilityState={{ checked }}
            onPress={() => onToggle(teacher.id)}
            className={`min-h-14 flex-row items-center gap-3 px-4 py-2 ${
              index > 0 ? "border-t border-line" : ""
            }`}
          >
            <PersonAvatar name={teacher.name} photoUrl={teacher.photoUrl} />
            <Text
              numberOfLines={1}
              className="ds-text-list-title flex-1 text-ink"
            >
              {teacher.name}
            </Text>
            <View
              className={`h-[26px] w-[26px] items-center justify-center rounded-checkbox border-2 ${
                checked ? "border-grape bg-grape" : "border-input-line bg-input"
              }`}
            >
              {checked ? (
                <Ionicons name="checkmark" size={18} color={theme.onColor} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
