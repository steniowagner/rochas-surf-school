import { ChipTone } from "@/components/ui/chip/chip.types";

import { PeopleRole } from "../people.types";

export const roleChip: Record<PeopleRole, { tone: ChipTone; labelKey: string }> = {
  student: { tone: "muted", labelKey: "profile.role.student" },
  instructor: { tone: "info", labelKey: "profile.role.instructor" },
  admin: { tone: "grape", labelKey: "profile.role.admin" },
};
