import { BatchRequest, NewClassForm } from "../classes.types";

/** The form as the backend expects it; only called with a complete form. Blank notes are left out. */
export const buildBatchRequest = (
  form: NewClassForm & {
    startDate: string;
    endDate: string;
    locationId: string;
  },
): BatchRequest => {
  const notes = form.notes.trim();

  return {
    discipline: form.discipline,
    level: form.level,
    startDate: form.startDate,
    endDate: form.endDate,
    weekdays: form.weekdays,
    timeRanges: form.timeRanges,
    locationId: form.locationId,
    instructorIds: form.instructorIds,
    capacity: form.capacity,
    ...(notes ? { notes } : {}),
  };
};
