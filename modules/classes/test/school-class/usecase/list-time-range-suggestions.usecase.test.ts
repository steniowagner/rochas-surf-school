import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListTimeRangeSuggestions } from "../../../src";
import {
  ADMIN,
  buildClass,
  FakeClockProvider,
  FakeSchoolClassRepository,
  INSTRUCTOR,
} from "../../mock";

const WEDNESDAY = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza

function classAt(start: string, end: string) {
  return buildClass({ startsAt: new Date(start), endsAt: new Date(end) });
}

function useCaseWith(classes: ReturnType<typeof classAt>[], now = WEDNESDAY) {
  return new ListTimeRangeSuggestions(
    new FakeSchoolClassRepository(classes),
    new FakeClockProvider(now),
  );
}

describe("ListTimeRangeSuggestions", () => {
  it("lists the distinct ranges of the classes, sorted", async () => {
    const useCase = useCaseWith([
      classAt("2026-10-10T19:00:00.000Z", "2026-10-10T20:00:00.000Z"), // Sat 16:00-17:00
      classAt("2026-10-06T11:00:00.000Z", "2026-10-06T12:00:00.000Z"), // Tue 08:00-09:00
      classAt("2026-10-08T11:00:00.000Z", "2026-10-08T12:00:00.000Z"), // Thu 08:00-09:00
    ]);

    const out = await useCase.execute({ actor: ADMIN });

    expect(out).toEqual({
      items: [
        { start: "08:00", end: "09:00" },
        { start: "16:00", end: "17:00" },
      ],
    });
  });

  it("lists the ranges of last week's and this week's classes, including ones that haven't started", async () => {
    const useCase = useCaseWith([
      classAt("2026-10-06T11:00:00.000Z", "2026-10-06T12:00:00.000Z"), // last Tue 08:00-09:00
      classAt("2026-10-14T09:00:00.000Z", "2026-10-14T10:00:00.000Z"), // today 06:00-07:00
      classAt("2026-10-16T19:00:00.000Z", "2026-10-16T20:00:00.000Z"), // Fri, later 16:00-17:00
    ]);

    const out = await useCase.execute({ actor: ADMIN });

    expect(out.items).toEqual([
      { start: "06:00", end: "07:00" },
      { start: "08:00", end: "09:00" },
      { start: "16:00", end: "17:00" },
    ]);
  });

  it("suggests a range used in both weeks once", async () => {
    const useCase = useCaseWith([
      classAt("2026-10-06T11:00:00.000Z", "2026-10-06T12:00:00.000Z"),
      classAt("2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"),
    ]);

    expect((await useCase.execute({ actor: ADMIN })).items).toEqual([
      { start: "08:00", end: "09:00" },
    ]);
  });

  it("ignores next week and two weeks ago, and counts the window edges", async () => {
    const useCase = useCaseWith([
      classAt("2026-10-19T03:00:00.000Z", "2026-10-19T04:00:00.000Z"), // next Monday 00:00 → out
      classAt("2026-10-19T02:59:00.000Z", "2026-10-19T03:30:00.000Z"), // this Sunday 23:59 → in
      classAt("2026-10-05T03:00:00.000Z", "2026-10-05T04:00:00.000Z"), // last Monday 00:00 → in
      classAt("2026-10-05T02:59:00.000Z", "2026-10-05T04:30:00.000Z"), // Sunday before → out
    ]);

    const out = await useCase.execute({ actor: ADMIN });

    expect(out.items).toEqual([
      { start: "00:00", end: "01:00" },
      { start: "23:59", end: "00:30" },
    ]);
  });

  it("skips cancelled classes", async () => {
    const cancelledAt = new Date("2026-10-13T12:00:00.000Z");
    const useCase = useCaseWith([
      buildClass({
        startsAt: new Date("2026-10-15T09:00:00.000Z"),
        endsAt: new Date("2026-10-15T10:00:00.000Z"),
        cancelledAt,
      }),
    ]);

    expect(await useCase.execute({ actor: ADMIN })).toEqual({ items: [] });
  });

  it("suggests a range once when a cancelled and a non-cancelled class share it", async () => {
    const cancelledAt = new Date("2026-10-13T12:00:00.000Z");
    const useCase = useCaseWith([
      buildClass({
        startsAt: new Date("2026-10-06T11:00:00.000Z"),
        endsAt: new Date("2026-10-06T12:00:00.000Z"),
        cancelledAt,
      }),
      classAt("2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"),
      buildClass({
        startsAt: new Date("2026-10-16T11:00:00.000Z"),
        endsAt: new Date("2026-10-16T12:00:00.000Z"),
        cancelledAt,
      }),
    ]);

    expect((await useCase.execute({ actor: ADMIN })).items).toEqual([
      { start: "08:00", end: "09:00" },
    ]);
  });

  it("sorts by start, then by end, keeping two ends for the same start", async () => {
    const useCase = useCaseWith([
      classAt("2026-10-06T11:00:00.000Z", "2026-10-06T13:00:00.000Z"),
      classAt("2026-10-07T11:00:00.000Z", "2026-10-07T12:00:00.000Z"),
      classAt("2026-10-07T09:00:00.000Z", "2026-10-07T10:00:00.000Z"),
    ]);

    const out = await useCase.execute({ actor: ADMIN });

    expect(out.items).toEqual([
      { start: "06:00", end: "07:00" },
      { start: "08:00", end: "09:00" },
      { start: "08:00", end: "10:00" },
    ]);
  });

  it("answers an empty list when no class is in the window", async () => {
    const useCase = useCaseWith([]);

    expect(await useCase.execute({ actor: ADMIN })).toEqual({ items: [] });
  });

  it("uses the week of the clock on a Monday morning", async () => {
    const monday = new Date("2026-10-12T03:00:00.000Z"); // Monday 00:00 in Fortaleza
    const useCase = useCaseWith(
      [
        classAt("2026-10-08T11:00:00.000Z", "2026-10-08T12:00:00.000Z"), // the week that ended → in
        classAt("2026-10-13T09:00:00.000Z", "2026-10-13T10:00:00.000Z"), // the week that started → in
        classAt("2026-10-19T09:00:00.000Z", "2026-10-19T10:00:00.000Z"), // next Monday → out
      ],
      monday,
    );

    expect((await useCase.execute({ actor: ADMIN })).items).toEqual([
      { start: "06:00", end: "07:00" },
      { start: "08:00", end: "09:00" },
    ]);
  });

  it("refuses accounts that are not approved admins", async () => {
    const useCase = useCaseWith([]);

    const pending = await useCase
      .execute({ actor: { ...ADMIN, status: "pending" } })
      .catch((e) => e);
    const instructor = await useCase.execute({ actor: INSTRUCTOR }).catch((e) => e);

    expect(pending).toBeInstanceOf(ForbiddenError);
    expect(pending.message).toBe("user.status.notApproved");
    expect(instructor.message).toBe("user.role.notAdmin");
  });
});
