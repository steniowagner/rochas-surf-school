import type { AppTParams } from "../i18n/app-t";

// Every entry of the instructor app page (and of instructor-app.html), as numbered in the spec 074 inventory.
export const instructorAppIds = [
  "IN-01-01",
  "IN-01-02",
  "IN-01-03",
  "IN-02-01",
  "IN-02-02",
  "IN-02-03",
  "IN-02-04",
  "IN-02-05",
  "IN-02-06",
  "IN-02-07",
  "IN-03-01",
  "IN-03-02",
  "IN-03-03",
  "IN-03-04",
  "IN-03-05",
  "IN-03-06",
  "IN-03-07",
  "IN-03-08",
  "IN-03-09",
  "IN-03-10",
  "IN-03-11",
  "IN-03-12",
  "IN-03-13",
  "IN-03-14",
  "IN-04-01",
  "IN-04-02",
  "IN-04-03",
  "IN-04-04",
  "IN-04-05",
  "IN-04-06",
  "IN-04-07",
  "IN-04-08",
  "IN-04-09",
  "IN-04-10",
  "IN-04-11",
  "IN-04-12",
  "IN-05-01",
  "IN-05-02",
  "IN-05-03",
  "IN-05-04",
  "IN-05-05",
  "IN-05-06",
  "IN-05-07",
  "IN-06-01",
  "IN-06-02",
  "IN-06-03",
  "IN-06-04",
  "IN-06-05",
  "IN-06-06",
] as const;

export type InstructorAppEntryId = (typeof instructorAppIds)[number];

/** An app message an entry's element can show: its key, with the values it is drawn with (`appParams` are app message keys). */
export type InstructorAppOtherMessage = string | { key: string; params?: AppTParams; appParams?: Record<string, string> };

const surf = { sport: "classesWeek.disciplineFilter.surf" };

/** The app messages an entry's element can show besides the one drawn (spec 072 D-02), listed in its note. */
export const instructorAppOtherMessages: Partial<Record<InstructorAppEntryId, InstructorAppOtherMessage[]>> = {
  "IN-03-10": ["people.whatsappNotShared"],
  "IN-04-05": ["teachingClasses.emptyFiltered.skate.title", "teachingClasses.emptyFiltered.skate.description"],
  "IN-04-10": [
    { key: "teachingHistory.emptyPeriod.descriptionSport", appParams: surf },
    "teachingHistory.emptyDay.title",
    "teachingHistory.emptyDay.description",
    { key: "teachingHistory.emptyDay.descriptionSport", appParams: surf },
  ],
  "IN-05-03": ["weeklyOccupancy.relativeWeek.current", "weeklyOccupancy.relativeWeek.previous", { key: "weeklyOccupancy.relativeWeek.ahead", params: { count: 2 } }, { key: "weeklyOccupancy.relativeWeek.ago", params: { count: 2 } }],
};
