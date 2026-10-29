// Fictional mock data for the designs: Brazilian names, Fortaleza places, America/Fortaleza times.
import type { ClassCardProps } from "../components/class-card/class-card.types";

export const students = [
  { id: "ana", label: "Ana Beatriz Lima", erased: false },
  { id: "caio", label: "Caio Sousa", erased: false },
  { id: "dani", label: "Daniela Reis", erased: false },
  { id: "eli", label: "Elisa Alves", erased: false },
  { id: "former", label: "Former student", erased: true },
] as const;

export const people = { name: "Ana Beatriz Lima", firstName: "Ana", email: "ana.lima@email.com" } as const;

type CardBase = Omit<ClassCardProps, "locale">;

const iracema: CardBase = {
  discipline: "surf",
  level: "beginner",
  state: "notStarted",
  timeRange: "08:00 – 09:30",
  locationName: "Praia de Iracema",
  seatsTaken: 4,
  capacity: 8,
  students: students.slice(0, 4).map((student) => ({ ...student })),
};

const futuro: CardBase = {
  ...iracema,
  discipline: "skate",
  level: "advanced",
  timeRange: "16:00 – 17:30",
  locationName: "Praia do Futuro",
  seatsTaken: 8,
};

export const classCards = {
  notStarted: iracema,
  full: futuro,
  next: { ...iracema, isNext: true },
  started: { ...iracema, state: "started", seatsTaken: 6 },
  finished: { ...iracema, state: "finished", seatsTaken: 5 },
  cancelled: { ...iracema, state: "cancelled" },
  flags: { ...iracema, showFlags: true, withoutInstructor: true, withoutDeadline: true },
  enrolment: { ...futuro, enrolment: "waitingList" },
  erased: {
    ...iracema,
    seatsTaken: 5,
    students: [students[0], students[4], students[1]].map((student) => ({ ...student })),
  },
} satisfies Record<string, CardBase>;

export const weekDays = [
  { date: "2026-09-07", weekday: "SEG", number: 7, selected: false, today: true, marked: true },
  { date: "2026-09-08", weekday: "TER", number: 8, selected: false, today: false, marked: false },
  { date: "2026-09-09", weekday: "QUA", number: 9, selected: true, today: false, marked: true },
  { date: "2026-09-10", weekday: "QUI", number: 10, selected: false, today: false, marked: false },
  { date: "2026-09-11", weekday: "SEX", number: 11, selected: false, today: false, marked: true },
  { date: "2026-09-12", weekday: "SÁB", number: 12, selected: false, today: false, marked: false },
  { date: "2026-09-13", weekday: "DOM", number: 13, selected: false, today: false, marked: false },
];

const monthDay = (date: string, number: number, extra: Partial<{ selected: boolean; today: boolean; marked: boolean; adjacent: boolean }> = {}) => ({
  date,
  number,
  selected: false,
  today: false,
  marked: false,
  adjacent: false,
  ...extra,
});

export const monthWeeks = [
  [monthDay("2026-08-31", 31, { adjacent: true }), ...[1, 2, 3, 4, 5, 6].map((n) => monthDay(`2026-09-0${n}`, n, n === 2 ? { marked: true } : {}))],
  [7, 8, 9, 10, 11, 12, 13].map((n) =>
    monthDay(`2026-09-${String(n).padStart(2, "0")}`, n, n === 7 ? { today: true, marked: true } : n === 9 ? { selected: true, marked: true } : n === 11 ? { marked: true } : {}),
  ),
  [14, 15, 16, 17, 18, 19, 20].map((n) => monthDay(`2026-09-${n}`, n, n === 16 ? { marked: true } : {})),
];

export const countries = [
  { code: "BR", name: "Brasil", dialCode: "+55" },
  { code: "PT", name: "Portugal", dialCode: "+351" },
  { code: "AR", name: "Argentina", dialCode: "+54" },
  { code: "US", name: "United States", dialCode: "+1" },
];

export const localeOptions = [
  { flag: "🇺🇸", key: "en-US", name: "English" },
  { flag: "🇪🇸", key: "es-ES", name: "Español" },
  { flag: "🇧🇷", key: "pt-BR", name: "Português" },
];

/** The instructor the instructor app page is signed in as (spec 074): Rafael Rocha, of the school's directory. */
export const instructorAccount = { id: "rafael", name: "Rafael Rocha", firstName: "Rafael" } as const;

/** The other instructor of the school's classes, the one who teaches what Rafael doesn't. */
export const otherInstructor = { id: "marina", name: "Marina Teixeira" } as const;

/** The trial guests of a class Rafael teaches: he sees their names (the backend's `canSeeGuestNames`). */
export const trialGuests = [
  { id: "lucas", name: "Lucas Martins" },
  { id: "bia", name: "Beatriz Nunes" },
];

/**
 * The day's classes of the instructor's "Aulas" tab (spec 074 D-04), without an enrolment: one under way, the one Rafael
 * teaches, one of another instructor, a full one and a cancelled one.
 */
export const instructorDayClasses: CardBase[] = [
  { ...iracema, state: "started", timeRange: "06:30 – 08:00", seatsTaken: 6 },
  iracema,
  { ...iracema, level: "advanced", timeRange: "10:00 – 11:30", locationName: "Praia do Futuro", seatsTaken: 3, students: students.slice(1, 4).map((student) => ({ ...student })) },
  futuro,
  { ...futuro, level: "beginner", state: "cancelled", timeRange: "17:30 – 19:00", seatsTaken: 2, students: students.slice(0, 2).map((student) => ({ ...student })) },
];
