import { ReleaseUpcomingClasses } from "../../../src";
import {
  ADMIN,
  buildClass,
  FakeClockProvider,
  FakeNoInstructorNotifier,
  FakeSchoolClassRepository,
  INSTRUCTOR,
} from "../../mock";

const NOW = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza
const A = INSTRUCTOR.id;
const B = ADMIN.id;

function day(date: string, overrides: Parameters<typeof buildClass>[0] = {}) {
  return buildClass({
    startsAt: new Date(`${date}T11:00:00.000Z`),
    endsAt: new Date(`${date}T12:00:00.000Z`),
    ...overrides,
  });
}

function setup(classes: ReturnType<typeof buildClass>[] = []) {
  const repository = new FakeSchoolClassRepository(classes);
  const notifier = new FakeNoInstructorNotifier();
  const useCase = new ReleaseUpcomingClasses(repository, notifier, new FakeClockProvider(NOW));

  return { useCase, repository, notifier };
}

describe("ReleaseUpcomingClasses", () => {
  it("releases the person from every upcoming class and tells the admins once about those left with nobody", async () => {
    const shared = day("2026-10-15", { instructorIds: [A, B], discipline: "skate" });
    const earliestAlone = day("2026-10-16", { discipline: "surf" });
    const laterAlone = day("2026-10-17", { discipline: "skate" });
    const { useCase, repository, notifier } = setup([laterAlone, shared, earliestAlone]);

    expect(await useCase.execute({ userId: A })).toEqual({ released: 3, withoutInstructor: 2 });

    expect((await repository.findById(shared.id))?.instructorIds).toEqual([B]);
    expect((await repository.findById(earliestAlone.id))?.instructorIds).toEqual([]);
    expect((await repository.findById(laterAlone.id))?.instructorIds).toEqual([]);
    expect(repository.all).toHaveLength(3);
    expect(repository.removeInstructorCalls).toEqual([
      { userId: A, classIds: [shared.id, earliestAlone.id, laterAlone.id] },
    ]);
    expect(notifier.events).toEqual([
      {
        count: 2,
        classId: earliestAlone.id,
        discipline: "surf",
        startsAt: earliestAlone.startsAt,
        excludeUserIds: [A],
      },
    ]);
  });

  it("releases only classes that haven't started and aren't cancelled", async () => {
    const tomorrow = day("2026-10-15", { instructorIds: [A, B] });
    const underWay = buildClass({
      startsAt: new Date("2026-10-14T12:30:00.000Z"),
      endsAt: new Date("2026-10-14T13:30:00.000Z"),
    });
    const finished = day("2026-10-13");
    const startingNow = buildClass({
      startsAt: NOW,
      endsAt: new Date("2026-10-14T14:00:00.000Z"),
    });
    const cancelled = day("2026-10-16", { cancelledAt: new Date("2026-10-14T10:00:00.000Z") });
    const { useCase, repository, notifier } = setup([
      tomorrow,
      underWay,
      finished,
      startingNow,
      cancelled,
    ]);

    expect(await useCase.execute({ userId: A })).toEqual({ released: 1, withoutInstructor: 0 });

    expect((await repository.findById(tomorrow.id))?.instructorIds).toEqual([B]);
    for (const kept of [underWay, finished, startingNow, cancelled]) {
      expect((await repository.findById(kept.id))?.instructorIds).toEqual([A]);
    }
    expect(notifier.events).toEqual([]);
  });

  it("picks the earliest class by id when two left with nobody start together", async () => {
    const second = day("2026-10-15", { id: "00000000-0000-4000-8000-00000000000b" });
    const first = day("2026-10-15", { id: "00000000-0000-4000-8000-00000000000a" });
    const { useCase, notifier } = setup([second, first]);

    await useCase.execute({ userId: A });

    expect(notifier.events).toHaveLength(1);
    expect(notifier.events[0]).toMatchObject({ count: 2, classId: first.id });
  });

  it("tells nobody when every released class keeps another instructor", async () => {
    const { useCase, notifier } = setup([day("2026-10-15", { instructorIds: [A, B] })]);

    expect(await useCase.execute({ userId: A })).toEqual({ released: 1, withoutInstructor: 0 });
    expect(notifier.events).toEqual([]);
  });

  it("writes and sends nothing when the person has no upcoming class", async () => {
    const { useCase, repository, notifier } = setup([day("2026-10-15", { instructorIds: [B] })]);

    expect(await useCase.execute({ userId: A })).toEqual({ released: 0, withoutInstructor: 0 });
    expect(repository.removeInstructorCalls).toEqual([]);
    expect(notifier.events).toEqual([]);
  });

  it("keeps the result and the write when the notifier throws", async () => {
    const alone = day("2026-10-15");
    const { useCase, repository, notifier } = setup([alone]);
    notifier.failNext = true;

    expect(await useCase.execute({ userId: A })).toEqual({ released: 1, withoutInstructor: 1 });
    expect((await repository.findById(alone.id))?.instructorIds).toEqual([]);
    expect(notifier.events).toHaveLength(1);
  });

  it("propagates a failed write and tells nobody", async () => {
    const { useCase, repository, notifier } = setup([day("2026-10-15")]);
    repository.removeInstructor = async () => {
      throw new Error("write failed");
    };

    await expect(useCase.execute({ userId: A })).rejects.toThrow("write failed");
    expect(notifier.events).toEqual([]);
  });
});
