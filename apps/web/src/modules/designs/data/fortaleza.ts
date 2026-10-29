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
export const instructorAccount = { id: "rafael", name: "Rafael Rocha", firstName: "Rafael", email: "rafael.rocha@email.com" } as const;

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

/** The counts of the instructor's home rows (D-04): the classes assigned to Rafael and the school's rules. */
export const instructorHome = { assignedClasses: 6, schoolRules: 3, unreadNotifications: 3 } as const;

/** "Minhas aulas" of Rafael (D-04): the class under way, then the next ones by day; the first one is the next. */
export const teachingClasses: {
  ongoing: CardBase;
  days: { date: string; label: "today" | "tomorrow" | "weekday"; classes: CardBase[] }[];
} = {
  ongoing: { ...iracema, state: "started", timeRange: "06:30 – 08:00", seatsTaken: 6 },
  days: [
    {
      date: "2026-09-07",
      label: "today",
      classes: [
        { ...iracema, isNext: true },
        { ...futuro, seatsTaken: 5, students: students.slice(0, 3).map((student) => ({ ...student })) },
      ],
    },
    { date: "2026-09-08", label: "tomorrow", classes: [{ ...iracema, timeRange: "07:00 – 08:30", seatsTaken: 3, students: students.slice(1, 4).map((student) => ({ ...student })) }] },
    {
      date: "2026-09-10",
      label: "weekday",
      classes: [
        { ...iracema, level: "advanced", timeRange: "10:00 – 11:30", locationName: "Praia do Futuro", seatsTaken: 8 },
        { ...futuro, level: "beginner", timeRange: "17:30 – 19:00", seatsTaken: 2, students: students.slice(0, 2).map((student) => ({ ...student })) },
      ],
    },
  ],
};

type OccupancyClass = CardBase & { id: string; day: number; time: string; cancelled?: boolean };

/**
 * The classes of the weekly occupancy (D-04), by their day of the week (0 is Monday): one under 50 %, some between 50
 * and 89 %, one at 90 %, a full one, a cancelled one and two at the same time on Saturday.
 */
export const occupancyClasses: OccupancyClass[] = [
  { ...iracema, id: "mon-0630", day: 0, time: "06:30", timeRange: "06:30 – 08:00", seatsTaken: 6 },
  { ...iracema, id: "mon-0800", day: 0, time: "08:00" },
  { ...iracema, id: "tue-0800", day: 1, time: "08:00", seatsTaken: 2, students: students.slice(0, 2).map((student) => ({ ...student })) },
  { ...iracema, id: "wed-0800", day: 2, time: "08:00", seatsTaken: 9, capacity: 10 },
  { ...futuro, id: "wed-1600", day: 2, time: "16:00" },
  { ...futuro, id: "thu-1600", day: 3, time: "16:00", level: "beginner", state: "cancelled", seatsTaken: 3, cancelled: true },
  { ...iracema, id: "fri-0630", day: 4, time: "06:30", timeRange: "06:30 – 08:00", level: "advanced", seatsTaken: 7 },
  { ...iracema, id: "sat-0800", day: 5, time: "08:00", seatsTaken: 3, students: students.slice(1, 4).map((student) => ({ ...student })) },
  { ...futuro, id: "sat-0800-skate", day: 5, time: "08:00", timeRange: "08:00 – 09:30", level: "beginner", seatsTaken: 5 },
];

/**
 * The admin the admin app page is signed in as (spec 075 D-01): Juliana Prado, who also teaches (spec 070's
 * instructor flag). She isn't in the student page's directory, so the admin's directory adds her (`adminDirectory`).
 */
export const adminAccount = { id: "juliana", name: "Juliana Prado", firstName: "Juliana", email: "juliana.prado@email.com" } as const;

/**
 * The day's classes of the admin's "Aulas" tab (D-04), with the admin's flags: one under way, one with no instructor,
 * one with no cancellation deadline, a full one and a cancelled one.
 */
export const adminDayClasses: CardBase[] = [
  { ...iracema, state: "started", timeRange: "06:30 – 08:00", seatsTaken: 6 },
  { ...iracema, showFlags: true, withoutInstructor: true },
  { ...iracema, level: "advanced", timeRange: "10:00 – 11:30", locationName: "Praia do Futuro", seatsTaken: 3, students: students.slice(1, 4).map((student) => ({ ...student })), showFlags: true, withoutDeadline: true },
  { ...futuro, showFlags: true },
  { ...futuro, level: "beginner", state: "cancelled", timeRange: "17:30 – 19:00", seatsTaken: 2, students: students.slice(0, 2).map((student) => ({ ...student })), showFlags: true },
];

/** The counts of the admin's home (D-04): what waits for her, the classes she teaches and the school's rules. */
export const adminHome = { classRequests: 5, registrations: 3, removedAccounts: 2, reactivations: 2, assignedClasses: 4, schoolRules: 3, unreadNotifications: 4 } as const;

/** The school's saved locations (D-04), and the one a class keeps after it was removed. */
export const classLocations = {
  iracema: { id: "iracema", name: "Praia de Iracema", address: "Av. Beira Mar, 2200 – Meireles, Fortaleza" },
  futuro: { id: "futuro", name: "Praia do Futuro", address: "Av. Zezé Diogo, 3500 – Praia do Futuro, Fortaleza" },
  skatePark: { id: "skate-park", name: "Skate Park do Aterrinho", address: "Av. Almirante Barroso, 901 – Praia de Iracema, Fortaleza" },
  removed: { id: "cumbuco", name: "Praia do Cumbuco", address: "Av. dos Coqueiros – Cumbuco, Caucaia", archived: true },
} as const;

/** The approved instructors and admins a class can be given to (D-04), by name. */
export const classTeachers = [
  { id: "bruno", name: "Bruno Costa" },
  { id: "carla", name: "Carla Mendes" },
  { id: "juliana", name: "Juliana Prado" },
  { id: "marcos", name: "Marcos Lima" },
  { id: "marina", name: "Marina Teixeira" },
  { id: "rafael", name: "Rafael Rocha" },
];

/** How many people each notice audience reaches (D-04). */
export const noticeAudienceCounts = { all: 48, students: 42, instructors: 6 } as const;

/** Who a message to the class of the details reaches: its instructor, its four students and the one pending request. */
export const classMessagePeople = [
  { id: "rafael", label: "Rafael Rocha", erased: false, role: "instructor" as const },
  ...students.slice(0, 4).map((student) => ({ id: student.id, label: student.label, erased: false, role: "student" as const })),
  { id: "pending-paulo", label: "Paulo Freitas", erased: false, role: "pending" as const },
];
