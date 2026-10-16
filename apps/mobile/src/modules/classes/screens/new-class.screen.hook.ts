import {
  CLASS_BATCH_MAX,
  CLASS_CAPACITY_MAX,
  CLASS_CAPACITY_MIN,
  CLASS_NOTES_MAX,
  listBatchClasses,
  listBatchDates,
  type ClassDiscipline,
  type ClassLevel,
  type TimeRange,
} from "@rochas-surf-school/classes";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAlertMessage } from "@/providers/alert-message";

import { ClassLocation } from "../classes.types";
import { useCreateClasses } from "../hooks/use-create-classes.hook";
import { useLocations } from "../hooks/use-locations.hook";
import { useTeachers } from "../hooks/use-teachers.hook";
import { useTimeRangeSuggestions } from "../hooks/use-time-range-suggestions.hook";
import { buildBatchRequest } from "../utils/batch-request";
import {
  DateRange,
  initialRange,
  minutesInSchoolZone,
  todayInSchoolZone,
} from "../utils/calendar";
import {
  getClassErrorKey,
  isInstructorsInvalidError,
  isLocationNotFoundError,
} from "../utils/class-error";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";
import {
  includesRange,
  isRangeBlocked,
  isSameRange,
  sortTimeRanges,
  startsByNow,
} from "../utils/time-ranges";

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_CAPACITY = 8;

export const useNewClassScreen = () => {
  const { t } = useTranslation();
  const alertMessage = useAlertMessage();
  const queryClient = useQueryClient();
  const locationsQuery = useLocations();
  const suggestionsQuery = useTimeRangeSuggestions();
  const teachersQuery = useTeachers();
  const createClasses = useCreateClasses();
  // The Aulas tab opens this screen with the day that was selected there.
  const { date } = useLocalSearchParams<{ date?: string }>();
  const today = todayInSchoolZone();

  const [discipline, setDiscipline] = useState<ClassDiscipline>("surf");
  const [level, setLevel] = useState<ClassLevel>("beginner");
  const [range, setRange] = useState<DateRange>(() => initialRange(date, today));
  const [selectedRanges, setSelectedRanges] = useState<TimeRange[]>([]);
  const [addedRanges, setAddedRanges] = useState<TimeRange[]>([]);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [capacity, setCapacity] = useState(DEFAULT_CAPACITY);
  const [notes, setNotes] = useState("");
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [timeSheetVisible, setTimeSheetVisible] = useState(false);
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  // A second press in the same frame must not send twice, before `isPending` has re-rendered.
  const sending = useRef(false);

  const { startDate, excludedDates } = range;
  // A single day is a range that ends on its start.
  const endDate = range.endDate ?? startDate;
  const locations = locationsQuery.data?.items ?? [];
  const location = locations.find((item) => item.id === locationId);

  const dates =
    startDate === null || endDate === null
      ? []
      : listBatchDates({ startDate, endDate, weekdays: ALL_WEEKDAYS, excludedDates }, CLASS_BATCH_MAX);
  // Only when today is among the dates can a time range have started already.
  const nowMinutes = dates.includes(today) ? minutesInSchoolZone() : null;
  // Selected times that have started on today's date: their classes there don't exist, one per time range at most.
  const pastRanges =
    nowMinutes === null
      ? []
      : selectedRanges.filter((item) => startsByNow(item, nowMinutes));
  const skipPast = pastRanges.length > 0;
  const classCount =
    startDate === null || endDate === null || selectedRanges.length === 0
      ? 0
      : listBatchClasses(
          {
            startDate,
            endDate,
            weekdays: ALL_WEEKDAYS,
            excludedDates,
            timeRanges: selectedRanges,
          },
          CLASS_BATCH_MAX + selectedRanges.length,
        ).length - pastRanges.length;
  const tooMany = classCount > CLASS_BATCH_MAX;
  const canSubmit =
    classCount >= 1 &&
    !tooMany &&
    location !== undefined &&
    instructorIds.length > 0;

  const toggleTimeRange = (item: TimeRange) =>
    setSelectedRanges((current) =>
      includesRange(current, item)
        ? current.filter((other) => !isSameRange(other, item))
        : sortTimeRanges([...current, item]),
    );

  const addTimeRange = (item: TimeRange) => {
    setAddedRanges((current) =>
      includesRange(current, item) ? current : [...current, item],
    );
    // A new range that can't go with the batch is only added to the list, as a blocked chip.
    if (
      !includesRange(selectedRanges, item) &&
      !isRangeBlocked(item, selectedRanges)
    ) {
      setSelectedRanges((current) => sortTimeRanges([...current, item]));
    }
    setTimeSheetVisible(false);
  };

  const selectLocation = (created: ClassLocation) => setLocationId(created.id);

  const toggleInstructor = (id: string) =>
    setInstructorIds((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id],
    );

  const changeCapacity = (value: number) =>
    setCapacity(Math.min(CLASS_CAPACITY_MAX, Math.max(CLASS_CAPACITY_MIN, value)));

  const submit = async () => {
    if (!canSubmit || startDate === null || endDate === null || sending.current) {
      return;
    }

    sending.current = true;

    try {
      const { count } = await createClasses.mutateAsync(
        buildBatchRequest({
          discipline,
          level,
          startDate,
          endDate,
          excludedDates,
          skipPast,
          timeRanges: selectedRanges,
          locationId: location.id,
          instructorIds,
          capacity,
          notes,
        }),
      );

      alertMessage.show(t("newClass.created", { count }));
      router.back();
    } catch (error) {
      if (isInstructorsInvalidError(error)) {
        void queryClient.invalidateQueries({ queryKey: ["people", "teachers"] });
      }

      if (isLocationNotFoundError(error)) {
        void queryClient.invalidateQueries({ queryKey: LOCATIONS_QUERY_KEY });
      }

      const messageKey = getClassErrorKey(error);

      if (messageKey !== null) {
        alertMessage.show(t(messageKey));
      }
    } finally {
      sending.current = false;
    }
  };

  return {
    discipline,
    setDiscipline,
    level,
    setLevel,
    today,
    range,
    setRange,
    dayCount: dates.length,
    suggestions: suggestionsQuery.data?.items ?? [],
    addedRanges,
    selectedRanges,
    nowMinutes,
    toggleTimeRange,
    addTimeRange,
    timeSheetVisible,
    openTimeSheet: () => setTimeSheetVisible(true),
    closeTimeSheet: () => setTimeSheetVisible(false),
    locations,
    location,
    locationId,
    setLocationId,
    selectLocation,
    locationSheetVisible,
    openLocationSheet: () => setLocationSheetVisible(true),
    closeLocationSheet: () => setLocationSheetVisible(false),
    capacity,
    changeCapacity,
    notes,
    setNotes,
    notesMaxLength: CLASS_NOTES_MAX,
    capacityMin: CLASS_CAPACITY_MIN,
    capacityMax: CLASS_CAPACITY_MAX,
    teachers: teachersQuery.data ?? [],
    teachersLoading: teachersQuery.isPending,
    teachersError: teachersQuery.isError,
    retryTeachers: () => void teachersQuery.refetch(),
    instructorIds,
    toggleInstructor,
    classCount,
    maxClasses: CLASS_BATCH_MAX,
    tooMany,
    canSubmit,
    loading: createClasses.isPending,
    submit,
  };
};
