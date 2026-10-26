import type { ClassDiscipline } from "@rochas-surf-school/classes";

/** Above this percentage the bar warns that the class is almost full. */
const ALMOST_FULL_PERCENT = 80;

export type OccupancyTone = "bad" | "sun" | "lagoon" | "tan";

/** The share of the seats taken, 0 to 100, rounded. */
export const getOccupancyPercent = (
  seatsTaken: number,
  capacity: number,
): number =>
  capacity > 0 ? Math.min(100, Math.round((seatsTaken / capacity) * 100)) : 0;

export const isClassFull = (seatsTaken: number, capacity: number): boolean =>
  seatsTaken >= capacity;

/** The fill of the bar: red when full, sun when almost full, otherwise the colour of the discipline. */
export const getOccupancyTone = (
  seatsTaken: number,
  capacity: number,
  discipline: ClassDiscipline,
): OccupancyTone => {
  if (isClassFull(seatsTaken, capacity)) {
    return "bad";
  }

  if (getOccupancyPercent(seatsTaken, capacity) > ALMOST_FULL_PERCENT) {
    return "sun";
  }

  return discipline === "surf" ? "lagoon" : "tan";
};

/** The seats still free, never below 0. */
export const getFreeSeats = (seatsTaken: number, capacity: number): number =>
  Math.max(0, capacity - seatsTaken);

/** The seats taken that no avatar shows ("+N"). */
export const getHiddenSeats = (
  seatsTaken: number,
  shownAvatars: number,
): number => Math.max(0, seatsTaken - shownAvatars);

export type StudentsLabel = {
  /** The translation key, under `classesWeek.students`. */
  key: "none" | "confirmed" | "present";
  count: number;
};

/** The footer line: "no students yet", "N confirmed", or "N present" once the class has finished. */
export const getStudentsLabel = (
  seatsTaken: number,
  finished: boolean,
): StudentsLabel => {
  if (finished && seatsTaken > 0) {
    return { key: "present", count: seatsTaken };
  }

  return seatsTaken === 0
    ? { key: "none", count: 0 }
    : { key: "confirmed", count: seatsTaken };
};
