import { FakeClassChangeNotifier } from "../../mock";

describe("FakeClassChangeNotifier", () => {
  it("records edited, cancelled, deleted and message events apart", async () => {
    const notifier = new FakeClassChangeNotifier();
    const event = {
      instructorIds: ["i-1"],
      classId: "c-1",
      discipline: "surf" as const,
      startsAt: new Date("2026-10-15T11:00:00.000Z"),
    };

    await notifier.classEdited(event);
    await notifier.classCancelled({ ...event, message: "Mar grande" });

    const { classId: _classId, ...deleted } = event;
    await notifier.classDeleted(deleted);
    await notifier.classMessage({ ...event, title: "Aviso", message: "Tragam protetor." });

    expect(notifier.deletedEvents).toEqual([deleted]);
    expect(notifier.editedEvents).toEqual([event]);
    expect(notifier.cancelledEvents).toEqual([{ ...event, message: "Mar grande" }]);
    expect(notifier.messageEvents).toEqual([{ ...event, title: "Aviso", message: "Tragam protetor." }]);
  });
});
