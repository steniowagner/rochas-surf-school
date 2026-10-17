import {
  CLASS_CAPACITY_MAX,
  CLASS_CAPACITY_MIN,
  CLASS_NOTES_MAX,
  getClassState,
  type TimeRange,
} from "@rochas-surf-school/classes";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";
import { ApiError, SessionExpiredError } from "@/services/api";

import { ClassItem, ClassLocation, EditClassRequest, Teacher } from "../classes.types";
import { useClass } from "../hooks/use-class.hook";
import { useEditClass } from "../hooks/use-edit-class.hook";
import { useLocations } from "../hooks/use-locations.hook";
import { useNow } from "../hooks/use-now.hook";
import { useTeachers } from "../hooks/use-teachers.hook";
import { useTimeRangeSuggestions } from "../hooks/use-time-range-suggestions.hook";
import { minutesInSchoolZone, todayInSchoolZone } from "../utils/calendar";
import {
  getEditClassErrorKey,
  getSeatsTaken,
  isClassFinishedError,
  isClassNotFoundError,
  isClassStartedError,
  isInstructorsInvalidError,
  isLocationNotFoundError,
} from "../utils/class-error";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";
import { includesRange, isSameRange, startsByNow } from "../utils/time-ranges";
import { schoolDayOf, schoolTimeOf } from "../utils/week";

import type { EditClassForm } from "./edit-class.screen.types";

const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((id) => b.includes(id));

const formOf = (item: ClassItem): EditClassForm => ({
  discipline: item.discipline,
  level: item.level,
  date: schoolDayOf(item.startsAt),
  range: { start: schoolTimeOf(item.startsAt), end: schoolTimeOf(item.endsAt) },
  locationId: item.location.id,
  capacity: item.capacity,
  notes: item.notes ?? "",
  instructorIds: item.instructors.map((instructor) => instructor.id),
});

export const useEditClassScreen = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const now = useNow();
  const classQuery = useClass(id);
  const locationsQuery = useLocations();
  const suggestionsQuery = useTimeRangeSuggestions();
  const teachersQuery = useTeachers();
  const editClass = useEditClass(id);
  const item = classQuery.data;
  const today = todayInSchoolZone(now);

  // What the admin changed so far, over the class's own values: nothing is copied into state until they edit.
  const [changes, setChanges] = useState<Partial<EditClassForm>>({});
  const [addedRanges, setAddedRanges] = useState<TimeRange[]>([]);
  // The server judged the class started before this phone's clock did.
  const [startedByServer, setStartedByServer] = useState(false);
  const [timeSheetVisible, setTimeSheetVisible] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  const initial = item ? formOf(item) : null;
  const form = initial ? { ...initial, ...changes } : null;
  const state = item
    ? getClassState(new Date(item.startsAt), new Date(item.endsAt), now)
    : null;
  const isStarted = state === "started" || (startedByServer && state !== "finished");
  const nowMinutes =
    form !== null && form.date === today ? minutesInSchoolZone(now) : null;

  const stored = item?.location;
  const queriedLocations = locationsQuery.data?.items ?? [];
  // The class's own location is always listed, even before (or without) the list of locations.
  const locations: ClassLocation[] =
    stored && !queriedLocations.some((location) => location.id === stored.id)
      ? [stored, ...queriedLocations]
      : queriedLocations;
  // The teachers, plus the class's instructors who no longer are one, so they can be removed.
  const queriedTeachers = teachersQuery.data ?? [];
  const keptTeachers: Teacher[] = (item?.instructors ?? [])
    .filter((instructor) => !queriedTeachers.some((teacher) => teacher.id === instructor.id))
    .map((instructor) => ({ id: instructor.id, name: instructor.name, role: "instructor" }));
  const teachers = [...queriedTeachers, ...keptTeachers];

  const ownRange = initial?.range ?? null;
  const suggestions =
    ownRange && !includesRange(suggestionsQuery.data?.items ?? [], ownRange)
      ? [...(suggestionsQuery.data?.items ?? []), ownRange]
      : (suggestionsQuery.data?.items ?? []);

  const instructorsChanged =
    form !== null && initial !== null && !sameIds(form.instructorIds, initial.instructorIds);
  const classChanged =
    form !== null &&
    initial !== null &&
    (form.discipline !== initial.discipline ||
      form.level !== initial.level ||
      form.date !== initial.date ||
      !isSameRange(form.range, initial.range) ||
      form.locationId !== initial.locationId ||
      form.capacity !== initial.capacity ||
      form.notes.trim() !== initial.notes.trim());
  const isValid =
    form !== null &&
    form.instructorIds.length > 0 &&
    (isStarted ||
      (form.date >= today &&
        !(nowMinutes !== null && startsByNow(form.range, nowMinutes))));
  const canSubmit = isValid && (instructorsChanged || (!isStarted && classChanged));

  const change = (patch: Partial<EditClassForm>) =>
    setChanges((current) => ({ ...current, ...patch }));

  const selectDate = (date: string | null) => {
    if (date !== null) {
      change({ date });
    }
  };

  const selectRange = (range: TimeRange) => change({ range });

  const addTimeRange = (range: TimeRange) => {
    setAddedRanges((current) =>
      includesRange(current, range) ? current : [...current, range],
    );
    // A new range that has already started today is only added to the list, as a blocked chip.
    if (nowMinutes === null || !startsByNow(range, nowMinutes)) {
      change({ range });
    }
    setTimeSheetVisible(false);
  };

  const selectLocation = (created: ClassLocation) => change({ locationId: created.id });

  const toggleInstructor = (instructorId: string) => {
    if (form === null) {
      return;
    }

    change({
      instructorIds: form.instructorIds.includes(instructorId)
        ? form.instructorIds.filter((other) => other !== instructorId)
        : [...form.instructorIds, instructorId],
    });
  };

  const changeCapacity = (value: number) =>
    change({ capacity: Math.min(CLASS_CAPACITY_MAX, Math.max(CLASS_CAPACITY_MIN, value)) });

  const showError = (error: unknown) => {
    if (isClassStartedError(error)) {
      setStartedByServer(true);
      void classQuery.refetch();
    }

    if (isClassFinishedError(error) || isClassNotFoundError(error)) {
      router.back();
    }

    if (isInstructorsInvalidError(error)) {
      void queryClient.invalidateQueries({ queryKey: ["people", "teachers"] });
    }

    if (isLocationNotFoundError(error)) {
      void queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
    }

    const messageKey = getEditClassErrorKey(error);

    if (messageKey !== null) {
      alertMessage.show(t(messageKey, { count: getSeatsTaken(error) ?? undefined }));
    }
  };

  const submit = async () => {
    if (!canSubmit || form === null || initial === null || sending.current) {
      return;
    }

    sending.current = true;
    // A started class keeps its stored values: only the instructors are sent as edited.
    const values = isStarted ? { ...initial, instructorIds: form.instructorIds } : form;
    const notes = values.notes.trim();
    const request: EditClassRequest = {
      discipline: values.discipline,
      level: values.level,
      date: values.date,
      start: values.range.start,
      end: values.range.end,
      locationId: values.locationId,
      instructorIds: values.instructorIds,
      capacity: values.capacity,
      ...(notes ? { notes } : {}),
    };

    try {
      await editClass.mutateAsync(request);

      alertMessage.show(t("editClass.saved"));
      router.back();
    } catch (error) {
      showError(error);
    } finally {
      sending.current = false;
    }
  };

  const isNotFound = classQuery.error instanceof ApiError && classQuery.error.status === 404;

  return {
    isLoading: classQuery.isPending,
    isNotFound,
    // An expired session is handled by the session flow: nothing to show here.
    isError: classQuery.isError && !isNotFound && !(classQuery.error instanceof SessionExpiredError),
    retry: () => void classQuery.refetch(),
    isFinished: state === "finished",
    isStarted,
    form,
    today,
    nowMinutes,
    ownRange: state === "not-started" && !isStarted ? ownRange : null,
    suggestions,
    addedRanges,
    locations,
    teachers,
    teachersLoading: teachersQuery.isPending,
    teachersError: teachersQuery.isError,
    retryTeachers: () => void teachersQuery.refetch(),
    setDiscipline: (discipline: EditClassForm["discipline"]) => change({ discipline }),
    setLevel: (level: EditClassForm["level"]) => change({ level }),
    selectDate,
    selectRange,
    addTimeRange,
    timeSheetVisible,
    openTimeSheet: () => setTimeSheetVisible(true),
    closeTimeSheet: () => setTimeSheetVisible(false),
    setLocationId: (locationId: string) => change({ locationId }),
    selectLocation,
    locationSheetVisible,
    openLocationSheet: () => setLocationSheetVisible(true),
    closeLocationSheet: () => setLocationSheetVisible(false),
    changeCapacity,
    setNotes: (notes: string) => change({ notes }),
    notesMaxLength: CLASS_NOTES_MAX,
    capacityMin: CLASS_CAPACITY_MIN,
    capacityMax: CLASS_CAPACITY_MAX,
    toggleInstructor,
    canSubmit,
    loading: editClass.isPending,
    submit,
  };
};
