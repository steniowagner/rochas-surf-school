import type { Locale } from "date-fns";

import {
  formatIsoDate,
  toUtcMs,
  weekdayAbbreviation,
  weekDays,
} from "@/utils/calendar-dates";

import type { ClassItem } from "../classes.types";
import { getOccupancyPercent, isClassFull } from "./occupancy";
import { schoolDayOf, schoolTimeOf } from "./week";

/** The look of a map cell: the 4 steps of the scale, plus the full and the cancelled classes. */
export type OccupancyCellTone = "cancelled" | "full" | "high" | "mid" | "low";

export type OccupancyCellLook = {
  tone: OccupancyCellTone;
  /** 0 to 100; meaningless for a cancelled class. */
  percent: number;
};

export type OccupancyMapDay = {
  /** `YYYY-MM-DD`. */
  date: string;
  /** "MON". */
  weekday: string;
  /** "19". */
  dayNumber: string;
  isToday: boolean;
};

/** A cell of the map: a class, or an empty slot where the day has none in that sub-row. */
export type OccupancyMapSlot =
  | { kind: "class"; date: string; item: ClassItem }
  | { kind: "empty"; date: string };

export type OccupancyMapRow = {
  /** "08:00". */
  time: string;
  /** Whether the row is the first one of its time, the only one that shows the time label. */
  showsTime: boolean;
  /** One slot per day of the week, Monday first. */
  slots: OccupancyMapSlot[];
};

const HIGH_PERCENT = 90;
const MID_PERCENT = 50;

/** The 7 days of the week, Monday first, with today's date marked. */
export const buildOccupancyDays = (
  weekStart: string,
  today: string,
  locale: Locale,
): OccupancyMapDay[] =>
  weekDays(weekStart).map((date) => ({
    date,
    weekday: weekdayAbbreviation(date, locale),
    dayNumber: formatIsoDate(date, "d", locale),
    isToday: date === today,
  }));

/**
 * The rows of the map: one per start time (Fortaleza), ascending. A time where several classes share a day gets as many
 * rows as the largest group of one day; on each day the k-th class (in the order given) goes in row k.
 */
export const buildOccupancyRows = (
  weekStart: string,
  classes: ClassItem[],
): OccupancyMapRow[] => {
  const dates = weekDays(weekStart);
  const byTime = new Map<string, Map<string, ClassItem[]>>();

  for (const item of classes) {
    const date = schoolDayOf(item.startsAt);

    if (!dates.includes(date)) {
      continue;
    }

    const time = schoolTimeOf(item.startsAt);
    const days = byTime.get(time) ?? new Map<string, ClassItem[]>();
    days.set(date, [...(days.get(date) ?? []), item]);
    byTime.set(time, days);
  }

  return [...byTime.keys()].sort().flatMap((time) => {
    const days = byTime.get(time)!;
    const subRows = Math.max(
      ...[...days.values()].map((items) => items.length),
    );

    return Array.from({ length: subRows }, (_, index): OccupancyMapRow => ({
      time,
      showsTime: index === 0,
      slots: dates.map((date): OccupancyMapSlot => {
        const item = days.get(date)?.[index];

        return item ? { kind: "class", date, item } : { kind: "empty", date };
      }),
    }));
  });
};

/** The tone and percentage a class's cell shows. */
export const getOccupancyCellLook = (item: ClassItem): OccupancyCellLook => {
  const percent = getOccupancyPercent(item.seatsTaken, item.capacity);

  if (item.cancelledAt) {
    return { tone: "cancelled", percent };
  }

  if (isClassFull(item.seatsTaken, item.capacity)) {
    return { tone: "full", percent };
  }

  if (percent >= HIGH_PERCENT) {
    return { tone: "high", percent };
  }

  return { tone: percent >= MID_PERCENT ? "mid" : "low", percent };
};

const fillRatio = (item: ClassItem): number =>
  item.capacity > 0 ? item.seatsTaken / item.capacity : 1;

/**
 * The class selected when a week loads: the non-cancelled one with the lowest share of seats taken (the first on a
 * tie), else the first class when all are cancelled; `null` for a week without classes.
 */
export const getDefaultSelectedClassId = (
  classes: ClassItem[],
): string | null => {
  let best: ClassItem | null = null;

  for (const item of classes) {
    if (!item.cancelledAt && (!best || fillRatio(item) < fillRatio(best))) {
      best = item;
    }
  }

  return (best ?? classes[0])?.id ?? null;
};

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export type RelativeWeek = {
  /** The key under `weeklyOccupancy.relativeWeek`. */
  key: "current" | "next" | "previous" | "ahead" | "ago";
  /** The number of weeks, for "ahead" and "ago"; 0 for the others. */
  count: number;
  /** Whether the week on screen is the current one. */
  isCurrent: boolean;
};

/** Where the week on screen is from the current one (both given by their Monday): this, next, last, N ahead or ago. */
export const getRelativeWeek = (
  currentWeekStart: string,
  weekStart: string,
): RelativeWeek => {
  const weeks = Math.round(
    (toUtcMs(weekStart) - toUtcMs(currentWeekStart)) / MS_PER_WEEK,
  );

  if (weeks === 0) {
    return { key: "current", count: 0, isCurrent: true };
  }

  if (weeks === 1) {
    return { key: "next", count: 0, isCurrent: false };
  }

  if (weeks === -1) {
    return { key: "previous", count: 0, isCurrent: false };
  }

  return weeks > 1
    ? { key: "ahead", count: weeks, isCurrent: false }
    : { key: "ago", count: -weeks, isCurrent: false };
};

export type OccupancyStatsFigures = {
  /** 0 to 100, rounded; 0 when there are no seats. */
  percent: number;
  taken: number;
  total: number;
  free: number;
  fullClasses: number;
};

/** The week's figures over its non-cancelled classes, each with its seats taken capped at its capacity. */
export const getOccupancyStats = (
  classes: ClassItem[],
): OccupancyStatsFigures => {
  let taken = 0;
  let total = 0;
  let fullClasses = 0;

  for (const item of classes) {
    if (item.cancelledAt) {
      continue;
    }

    taken += Math.min(item.seatsTaken, item.capacity);
    total += item.capacity;

    if (isClassFull(item.seatsTaken, item.capacity)) {
      fullClasses += 1;
    }
  }

  return {
    percent: getOccupancyPercent(taken, total),
    taken,
    total,
    free: total - taken,
    fullClasses,
  };
};
