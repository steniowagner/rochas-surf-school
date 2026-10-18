import { FakeClassChangeNotifier } from "../../mock";

describe("FakeClassChangeNotifier", () => {
  it("records edited and cancelled events apart", async () => {
    const notifier = new FakeClassChangeNotifier();
    const event = {
      instructorIds: ["i-1"],
      classId: "c-1",
      discipline: "surf" as const,
      startsAt: new Date("2026-10-15T11:00:00.000Z"),
    };

    await notifier.classEdited(event);
    await notifier.classCancelled({ ...event, message: "Mar grande" });

    expect(notifier.editedEvents).toEqual([event]);
    expect(notifier.cancelledEvents).toEqual([{ ...event, message: "Mar grande" }]);
  });
});
