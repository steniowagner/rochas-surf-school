import { appT } from "@/modules/designs/i18n/app-t";

import { AppIcon } from "../app-icon";

import type { CapacityStepperProps } from "./capacity-stepper.types";

/** "Lotação máxima": the number of students per class, from `min` to `max`, one at a time. */
export function CapacityStepper({ locale, value, min, max }: CapacityStepperProps) {
  const t = (key: string) => appT(locale, key);
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div className="flex items-center justify-between rounded-card border border-line bg-surface p-4">
      <button type="button" aria-label={t("newClass.capacity.decrease")} disabled={atMin} className={`flex size-11 items-center justify-center rounded-full bg-sand ${atMin ? "opacity-40" : ""}`}>
        <AppIcon name="Ionicons:remove" size={22} className="text-ink" />
      </button>
      <div className="flex flex-col items-center">
        <p className="ds-text-lesson-time text-ink">{value}</p>
        <p className="ds-text-list-subtitle text-ink-2">{t("newClass.capacity.unit")}</p>
      </div>
      <button type="button" aria-label={t("newClass.capacity.increase")} disabled={atMax} className={`flex size-11 items-center justify-center rounded-full bg-sand ${atMax ? "opacity-40" : ""}`}>
        <AppIcon name="Ionicons:add" size={22} className="text-ink" />
      </button>
    </div>
  );
}
