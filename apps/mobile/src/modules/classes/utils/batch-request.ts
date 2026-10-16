import { BatchRequest, NewClassForm } from "../classes.types";

const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * The form as the backend expects it; only called with a complete form. Blank notes, an empty list of excluded
 * dates and a `skipPast` of `false` are left out.
 */
export const buildBatchRequest = (
  form: NewClassForm & {
    startDate: string;
    endDate: string;
    locationId: string;
  },
): BatchRequest => {
  const notes = form.notes.trim();
  const { excludedDates } = form;

  return {
    discipline: form.discipline,
    level: form.level,
    startDate: form.startDate,
    endDate: form.endDate,
    weekdays: ALL_WEEKDAYS,
    ...(excludedDates.length > 0 ? { excludedDates } : {}),
    ...(form.skipPast ? { skipPast: true } : {}),
    timeRanges: form.timeRanges,
    locationId: form.locationId,
    instructorIds: form.instructorIds,
    capacity: form.capacity,
    ...(notes ? { notes } : {}),
  };
};
