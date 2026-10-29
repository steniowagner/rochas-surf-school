import { Button } from "@/modules/designs/components/button";
import { CapacityStepper } from "@/modules/designs/components/capacity-stepper";
import { DateRangeCalendar } from "@/modules/designs/components/date-range-calendar";
import { FormSection } from "@/modules/designs/components/form-section";
import { GuestsWarning } from "@/modules/designs/components/guests-warning";
import { InstructorPicker } from "@/modules/designs/components/instructor-picker";
import { LocationPicker } from "@/modules/designs/components/location-picker";
import { PhoneFrame } from "@/modules/designs/components/phone-frame";
import { SegmentedControl } from "@/modules/designs/components/segmented-control";
import { StackHeader } from "@/modules/designs/components/stack-header";
import { TextArea } from "@/modules/designs/components/text-area";
import { TimeRangePicker } from "@/modules/designs/components/time-range-picker";
import { rangeCalendar, timeChips } from "@/modules/designs/data/admin-app";
import { classLocations, classTeachers, trialGuests } from "@/modules/designs/data/fortaleza";
import { appT } from "@/modules/designs/i18n/app-t";
import { joinAudience } from "@/modules/designs/utils/audience";

import type { EditClassScreenProps } from "./edit-class-screen.types";

// The app's `CLASS_NOTES_MAX`, `CLASS_CAPACITY_MIN` and `CLASS_CAPACITY_MAX`.
const NOTES_MAX = 300;
const CAPACITY_MIN = 1;
const CAPACITY_MAX = 20;
// The class of the details: Wednesday 9 September, 08:00 – 09:30, with four students, one pending request and two guests.
const CLASS_DAY = "2026-09-09";
const STUDENTS = 4;
const PENDING = 1;

/** "Editar aula": the class's day, time, place, capacity, notes and instructors; saving tells the instructors and the class's people. */
export function EditClassScreen({ locale, state, notes }: EditClassScreenProps) {
  const t = (key: string, params?: Record<string, string | number>) => appT(locale, key, params);
  const managing = state === "managingLocations";
  // The class of `managingLocations` kept the place that was removed since; it is listed first, marked.
  const locations = managing ? [classLocations.removed, classLocations.iracema, classLocations.futuro, classLocations.skatePark] : [classLocations.iracema, classLocations.futuro, classLocations.skatePark];
  const note = t("editClass.noteWithAudience", {
    list: joinAudience([t("editClass.audience.instructors"), t("editClass.audience.students", { count: STUDENTS }), t("editClass.audience.pending", { count: PENDING })], t("editClass.audience.and")),
  });
  const header = <StackHeader title={t("editClass.title")} />;

  if (state === "loading") {
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col bg-page">
          {header}
          <div className="flex justify-center px-5 pt-3">
            <span role="status" aria-label={t("editClass.title")} className="size-5 animate-spin rounded-full border-2 border-grape border-t-transparent" />
          </div>
        </div>
      </PhoneFrame>
    );
  }

  const locationSection = (
    <FormSection label={t("newClass.location.label")} actionLabel={t(managing ? "locationPicker.done" : "locationPicker.manage")}>
      <LocationPicker locale={locale} locations={locations} selectedId={managing ? classLocations.removed.id : classLocations.iracema.id} managing={managing} />
    </FormSection>
  );
  const instructorsSection = (
    <FormSection label={t("newClass.instructors.label")}>
      <InstructorPicker locale={locale} teachers={classTeachers} selectedIds={["rafael"]} />
    </FormSection>
  );

  return (
    <PhoneFrame tall={state === "edit"}>
      <div className={`flex flex-1 flex-col bg-page${managing ? " min-h-0" : ""}`}>
        {header}
        <div className={`flex flex-col gap-6 px-5 pb-6 pt-2${managing ? " min-h-0 flex-1 overflow-hidden" : ""}`}>
          {state === "started" ? (
            <div className="flex flex-col gap-1 rounded-card bg-sun p-4">
              <p className="ds-text-list-title text-on-color">{t("editClass.started.title")}</p>
              <p className="ds-text-list-subtitle text-on-color">{t("editClass.started.description")}</p>
            </div>
          ) : managing ? (
            // Scrolled down to the locations, as the admin who manages them sees the form.
            locationSection
          ) : (
            <>
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
              <FormSection label={t("editClass.day.label")} hint={t("editClass.day.hint")}>
                <DateRangeCalendar locale={locale} {...rangeCalendar(locale, { start: CLASS_DAY, end: null, excluded: [] })} />
              </FormSection>
              <FormSection label={t("editClass.time.label")}>
                <TimeRangePicker locale={locale} chips={timeChips(["08:00 – 09:30"], true)} showSuggestionsHint showPastHint={false} showOverlapHint={false} />
              </FormSection>
              {locationSection}
              <FormSection label={t("newClass.capacity.label")}>
                <CapacityStepper locale={locale} value={8} min={CAPACITY_MIN} max={CAPACITY_MAX} />
              </FormSection>
              <FormSection label={t("newClass.notes.label")} hint={t("newClass.notes.optional")}>
                <TextArea value={notes} maxLength={NOTES_MAX} placeholder={t("newClass.notes.placeholder")} />
              </FormSection>
            </>
          )}
          {managing ? null : instructorsSection}
        </div>
        <div className="flex flex-col gap-2 border-t border-line bg-page px-5 pb-8 pt-3">
          <GuestsWarning locale={locale} count={trialGuests.length} />
          <p className="ds-text-list-subtitle text-center text-ink-2">{note}</p>
          {/* "Salvar e notificar" waits for a change. */}
          <Button disabled>{t("editClass.submit")}</Button>
        </div>
      </div>
    </PhoneFrame>
  );
}
