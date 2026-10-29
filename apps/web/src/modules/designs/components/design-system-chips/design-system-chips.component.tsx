import { appT } from "@/modules/designs/i18n/app-t";

import { Chip } from "../chip";
import type { ChipProps, ChipTone } from "../chip/chip.types";
import { DesignEntry } from "../design-entry";
import { DesignSection } from "../design-section";

import type { DesignSystemSectionProps } from "./design-system-chips.types";

const tones: ChipTone[] = ["surf", "skate", "info", "sun", "grape", "warn", "ok", "bad", "muted", "onHighlight"];

const enrolments: { key: string; tone: ChipProps["tone"]; icon: NonNullable<ChipProps["icon"]> }[] = [
  { key: "pending", tone: "warn", icon: "Ionicons:hourglass-outline" },
  { key: "waitingList", tone: "info", icon: "Ionicons:list-outline" },
  { key: "approved", tone: "ok", icon: "Ionicons:checkmark-circle-outline" },
  { key: "denied", tone: "bad", icon: "Ionicons:close-circle-outline" },
  { key: "withdrawn", tone: "muted", icon: "Ionicons:arrow-undo-outline" },
  { key: "expired", tone: "muted", icon: "Ionicons:time-outline" },
  { key: "cancelled", tone: "muted", icon: "Ionicons:remove-circle-outline" },
  { key: "takenOut", tone: "bad", icon: "Ionicons:remove-circle-outline" },
];

export function DesignSystemChips({ locale, text }: DesignSystemSectionProps) {
  const t = (key: string) => appT(locale, key);
  const e = text.entries;

  return (
    <DesignSection number="05" title={text.sections.chips.title} description={text.sections.chips.description}>
      <DesignEntry id="DS-05-01" title={e["DS-05-01"].title} note={e["DS-05-01"].note}>
        <div className="flex flex-col gap-3">
          {(["default", "compact"] as const).map((size) => (
            <div key={size} className="flex flex-wrap items-center gap-2 rounded-card bg-grape p-3">
              {tones.map((tone) => (
                <Chip key={tone} tone={tone} size={size}>{tone}</Chip>
              ))}
            </div>
          ))}
        </div>
      </DesignEntry>
      <DesignEntry id="DS-05-02" title={e["DS-05-02"].title} note={e["DS-05-02"].note}>
        <div className="flex flex-wrap gap-2">
          <Chip tone="sun" icon="Ionicons:time-outline">{t("classesWeek.state.started")}</Chip>
          <Chip tone="bad" icon="Ionicons:close-circle-outline">{t("classesWeek.cancelled")}</Chip>
          <Chip tone="muted" icon="Ionicons:checkmark-outline" size="compact">{t("classesWeek.state.finished")}</Chip>
        </div>
      </DesignEntry>
      <DesignEntry id="DS-05-03" title={e["DS-05-03"].title} note={e["DS-05-03"].note}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Chip tone="surf">{t("newClass.discipline.surf")}</Chip>
            <Chip tone="skate">{t("newClass.discipline.skate")}</Chip>
            <Chip tone="info">{t("newClass.level.beginner")}</Chip>
            <Chip tone="info">{t("newClass.level.advanced")}</Chip>
            <Chip tone="info">{t("newClass.level.expert")}</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="sun" icon="Ionicons:time-outline">{t("teachingClasses.next")}</Chip>
            <Chip tone="sun" icon="Ionicons:time-outline">{t("classesWeek.state.started")}</Chip>
            <Chip tone="muted" icon="Ionicons:checkmark-outline">{t("classesWeek.state.finished")}</Chip>
            <Chip tone="bad" icon="Ionicons:close-circle-outline">{t("classesWeek.cancelled")}</Chip>
            <Chip tone="bad">{t("classesWeek.full")}</Chip>
            <Chip tone="warn" icon="Ionicons:person-remove-outline">{t("classesWeek.noInstructor")}</Chip>
            <Chip tone="warn" icon="Ionicons:calendar-clear-outline">{t("classesWeek.noDeadline")}</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            {enrolments.map((item) => (
              <Chip key={item.key} tone={item.tone} icon={item.icon}>{t(`enrolment.status.${item.key}.chip`)}</Chip>
            ))}
          </div>
        </div>
      </DesignEntry>
    </DesignSection>
  );
}
