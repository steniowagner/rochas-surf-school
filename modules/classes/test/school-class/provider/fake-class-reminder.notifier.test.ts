import { FakeClassReminderNotifier } from "../../mock";

describe("FakeClassReminderNotifier", () => {
  const event = {
    recipientIds: ["s-1", "i-1"],
    classId: "c-1",
    discipline: "surf" as const,
    startsAt: new Date("2026-10-15T11:00:00.000Z"),
    locationName: "Praia do Futuro",
  };

  it("records every reminder", async () => {
    const notifier = new FakeClassReminderNotifier();

    await notifier.classReminder(event);

    expect(notifier.reminders).toEqual([event]);
  });

  it("records the reminder and throws when told to fail", async () => {
    const notifier = new FakeClassReminderNotifier();
    notifier.fail = true;

    await expect(notifier.classReminder(event)).rejects.toThrow("notifier down");
    expect(notifier.reminders).toEqual([event]);
  });
});
