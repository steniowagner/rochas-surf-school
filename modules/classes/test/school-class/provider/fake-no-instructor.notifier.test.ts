import { FakeNoInstructorNotifier } from "../../mock";

describe("FakeNoInstructorNotifier", () => {
  const event = {
    count: 2,
    classId: "c-1",
    discipline: "surf" as const,
    startsAt: new Date("2026-10-15T11:00:00.000Z"),
    excludeUserIds: ["u-1"],
  };

  it("records every event", async () => {
    const notifier = new FakeNoInstructorNotifier();

    await notifier.classesWithoutInstructor(event);

    expect(notifier.events).toEqual([event]);
  });

  it("fails once when asked to, still recording the event", async () => {
    const notifier = new FakeNoInstructorNotifier();
    notifier.failNext = true;

    await expect(notifier.classesWithoutInstructor(event)).rejects.toThrow(
      "classesWithoutInstructor failed",
    );
    await notifier.classesWithoutInstructor(event);

    expect(notifier.events).toEqual([event, event]);
  });
});
