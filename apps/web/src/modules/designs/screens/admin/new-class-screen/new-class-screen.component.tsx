import { Button } from "@/modules/designs/components/button";
import { CapacityStepper } from "@/modules/designs/components/capacity-stepper";
import { DateRangeCalendar } from "@/modules/designs/components/date-range-calendar";
import { FormSection } from "@/modules/designs/components/form-section";
import { InstructorPicker } from "@/modules/designs/components/instructor-picker";
import { LocationPicker } from "@/modules/designs/components/location-picker";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SegmentedControl } from "@/modules/designs/components/segmented-control";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TextArea } from "@/modules/designs/components/text-area";
import { TimeRangePicker } from "@/modules/designs/components/time-range-picker";
import { TimeRangeSheet } from "@/modules/designs/components/time-range-sheet";
import { adminDates, rangeCalendar, timeChips } from "@/modules/designs/data/admin-app";
import { classLocations, classTeachers } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";

import type { NewClassScreenProps } from "./new-class-screen.types";

// The app's `CLASS_NOTES_MAX`, `CLASS_CAPACITY_MIN` and `CLASS_CAPACITY_MAX`.
const NOTES_MAX = 300;
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 20;
// The filled batch: 14 to 18 September without the 16th, at 08:00 and 16:00, at Praia de Iracema, by Juliana and Rafael.
const FILLED = { start: "2026-09-14", end: "2026-09-18", excluded: ["2026-09-16"] };
const FILLED_RANGES = ["08:00 – 09:30", "16:00 – 17:30"];
const FILLED_DAYS = 4;

/** "Nova aula": the batch's discipline, level, days, times, place, capacity, notes and instructors, then how many classes it creates. */
export function NewClassScreen({ locale, state, notes }: NewClassScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const filled = state === "filled";
  const dates = adminDates(locale);
  const selection = filled ? FILLED : { start: null, end: null, excluded: [] };
  const selectedRanges = filled ? FILLED_RANGES : [];
  const classCount = filled ? FILLED_DAYS * FILLED_RANGES.length : 0;
  const locations = [classLocations.iracema, classLocations.futuro, classLocations.skatePark];

  return (
    <PhoneFrame tall={state !== "timeSheet"}>
      <div className={`flex flex-1 flex-col bg-page${state === "timeSheet" ? " min-h-0" : ""}`}>
        <StackHeader title={t("newClass.title")} />
        <div className={`flex flex-col gap-6 px-5 pb-6 pt-2${state === "timeSheet" ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
          <FormSection label={t("newClass.discipline.label")}>
            <SegmentedControl
              options={[
                { value: "surf", label: t("newClass.discipline.surf") },
                { value: "skate", label: t("newClass.discipline.skate") },
              ]}
              value="surf"
            />
          </FormSection>
          <FormSection label={t("newClass.level.label")} hint={t("newClass.level.hint")}>
            <SegmentedControl
              options={[
                { value: "beginner", label: t("newClass.level.beginner") },
                { value: "advanced", label: t("newClass.level.advanced") },
                { value: "expert", label: t("newClass.level.expert") },
              ]}
              value="beginner"
            />
          </FormSection>
          <FormSection label={t("newClass.days.label")} hint={filled ? t("newClass.days.count", { count: FILLED_DAYS }) : t("newClass.days.pickOne")}>
            <DateRangeCalendar
              locale={locale}
              {...rangeCalendar(locale, selection)}
              summary={{
                from: selection.start === null ? null : dates.shortDay(selection.start),
                to: selection.end === null ? null : dates.shortDay(selection.end),
                excluded: selection.excluded.map((date) => ({ date, label: dates.shortDay(date) })),
              }}
            />
          </FormSection>
          <FormSection label={t("newClass.timeRanges.label")} hint={filled ? undefined : t("newClass.timeRanges.pickOne")}>
            <TimeRangePicker locale={locale} chips={timeChips(selectedRanges)} showSuggestionsHint showPastHint={false} showOverlapHint={filled} />
          </FormSection>
          <FormSection label={t("newClass.location.label")} hint={filled ? undefined : t("newClass.location.pickOne")} actionLabel={t("locationPicker.manage")}>
            <LocationPicker locale={locale} locations={locations} selectedId={filled ? classLocations.iracema.id : null} managing={false} />
          </FormSection>
          <FormSection label={t("newClass.capacity.label")}>
            <CapacityStepper locale={locale} value={8} min={CAPACITY_MIN} max={CAPACITY_MAX} />
          </FormSection>
          <FormSection label={t("newClass.notes.label")} hint={t("newClass.notes.optional")}>
            <TextArea value={filled ? notes : ""} maxLength={NOTES_MAX} placeholder={t("newClass.notes.placeholder")} />
          </FormSection>
          <FormSection label={t("newClass.instructors.label")} hint={filled ? undefined : t("newClass.instructors.pickOne")}>
            <InstructorPicker locale={locale} teachers={classTeachers} selectedIds={filled ? ["juliana", "rafael"] : []} />
          </FormSection>
        </div>
        <div className="flex flex-col gap-2 border-t border-line bg-page px-5 pb-8 pt-3">
          {filled ? (
            <p className="ds-text-list-subtitle text-center text-ink-2">
              {t("newClass.summary.line", {
                days: t("newClass.summary.days", { count: FILLED_DAYS }),
                times: t("newClass.summary.times", { count: FILLED_RANGES.length }),
                location: classLocations.iracema.name,
              })}
            </p>
          ) : null}
          <Button disabled={!filled}>{t("newClass.submit", { count: Math.max(classCount, 1) })}</Button>
        </div>
        {state === "timeSheet" ? <TimeRangeSheet locale={locale} /> : null}
      </div>
    </PhoneFrame>
  );
}
