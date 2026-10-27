import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity } from "react-native";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button/button.constants";

import { StudentAvatar } from "../student-avatar";

import type { InstructorPillProps } from "./instructor-pill.types";

const AVATAR_SIZE = 32;

/** One instructor of the class details: avatar and name in a pill that opens their person sheet. */
export function InstructorPill({
  name,
  isViewer,
  onPress,
  erased = false,
}: InstructorPillProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={name}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      disabled={!onPress}
      onPress={onPress}
      className={`min-h-11 flex-row items-center gap-2 rounded-full border bg-surface py-1 pl-1 pr-3.5 ${
        isViewer ? "border-lagoon" : "border-line"
      }`}
    >
      <StudentAvatar
        name={name}
        photoUrl={null}
        size={AVATAR_SIZE}
        erased={erased}
      />
      <Text numberOfLines={1} className="ds-text-list-title text-ink">
        {isViewer ? t("classDetails.you") : name}
      </Text>
    </TouchableOpacity>
  );
}
