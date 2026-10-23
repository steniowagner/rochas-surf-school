import { CLASS_REMINDER_LEAD_MINUTES, ClassStudent, SendClassReminders } from "../../../src";
import {
  ADMIN,
  buildClass,
  buildLocation,
  FakeClassReminderNotifier,
  FakeClassRosterReader,
  FakeLocationRepository,
  FakeSchoolClassRepository,
  INSTRUCTOR_ID,
} from "../../mock";

const STARTS_AT = new Date("2026-10-15T11:00:00.000Z"); // 08:00 in Fortaleza
const AT_0730 = new Date("2026-10-15T10:30:00.000Z");
const S1 = "5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25";
const S2 = "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b";
const location = buildLocation("Praia do Futuro");

function student(id: string): ClassStudent {
  return { id, name: `Student ${id.slice(0, 4)}`, photoUrl: null, enrolmentId: `enrolment-${id}` };
}

function classAt(overrides: Parameters<typeof buildClass>[0] = {}) {
  return buildClass({
    startsAt: STARTS_AT,
    endsAt: new Date("2026-10-15T12:00:00.000Z"),
    locationId: location.id,
    instructorIds: [INSTRUCTOR_ID, ADMIN.id],
    ...overrides,
  });
}

function setup(
  classes: ReturnType<typeof buildClass>[],
  options: { rosters?: ConstructorParameters<typeof FakeClassRosterReader>[0]; now?: Date } = {},
) {
  const repository = new FakeSchoolClassRepository(classes);
  const rosters = new FakeClassRosterReader(options.rosters ?? {});
  const locations = new FakeLocationRepository([location]);
  const notifier = new FakeClassReminderNotifier();
  const clock = { now: options.now ?? AT_0730 };
  const useCase = new SendClassReminders(repository, rosters, locations, notifier, {
    now: () => new Date(clock.now.getTime()),
  });

  return { useCase, repository, rosters, locations, notifier, clock };
}

describe("SendClassReminders", () => {
  it("reminds 30 minutes before the start", () => {
    expect(CLASS_REMINDER_LEAD_MINUTES).toBe(30);
  });

  it("reminds the approved students and every instructor once, and marks the class", async () => {
    const item = classAt();
    const { useCase, repository, notifier } = setup([item], {
      rosters: { [item.id]: { students: [student(S1), student(ADMIN.id)], guests: [{ id: "g-1", name: "Guest" }] } },
    });

    expect(await useCase.execute()).toEqual({ reminded: 1 });

    expect(notifier.reminders).toEqual([
      {
        recipientIds: [S1, ADMIN.id, INSTRUCTOR_ID],
        classId: item.id,
        discipline: "surf",
        startsAt: STARTS_AT,
        locationName: "Praia do Futuro",
      },
    ]);
    expect((await repository.findById(item.id))!.reminderSentAt).toEqual(AT_0730);
  });

  it("reads the rosters of every due class in one read and the location once", async () => {
    const first = classAt();
    const second = classAt({ discipline: "skate", instructorIds: [ADMIN.id] });
    const { useCase, rosters, locations, notifier } = setup([first, second], {
      rosters: { [first.id]: { students: [student(S1)] }, [second.id]: { students: [student(S2)] } },
    });
    const findById = jest.spyOn(locations, "findById");

    expect(await useCase.execute()).toEqual({ reminded: 2 });

    expect(rosters.calls).toEqual([{ classIds: [first.id, second.id], studentsLimit: undefined }]);
    expect(findById).toHaveBeenCalledTimes(1);
    expect(notifier.reminders.map((event) => [event.discipline, event.recipientIds])).toEqual([
      ["surf", [S1, INSTRUCTOR_ID, ADMIN.id]],
      ["skate", [S2, ADMIN.id]],
    ]);
  });

  it.each([
    ["31 minutes before the start", new Date("2026-10-15T10:29:00.000Z")],
    ["at the start", STARTS_AT],
    ["after the start", new Date("2026-10-15T11:05:00.000Z")],
  ])("reminds nothing %s", async (_when, now) => {
    const item = classAt();
    const { useCase, repository, rosters, notifier } = setup([item], { now });

    expect(await useCase.execute()).toEqual({ reminded: 0 });

    expect(notifier.reminders).toHaveLength(0);
    expect(rosters.calls).toHaveLength(0);
    expect((await repository.findById(item.id))!.reminderSentAt).toBeNull();
  });

  it("reminds a class created inside the window at the next run", async () => {
    const item = classAt();
    const { useCase, notifier } = setup([item], { now: new Date("2026-10-15T10:46:00.000Z") });

    expect(await useCase.execute()).toEqual({ reminded: 1 });
    expect(notifier.reminders).toHaveLength(1);
  });

  it("reminds a class start only once", async () => {
    const item = classAt();
    const { useCase, notifier, clock } = setup([item]);

    await useCase.execute();
    clock.now = new Date("2026-10-15T10:31:00.000Z");
    expect(await useCase.execute()).toEqual({ reminded: 0 });
    clock.now = new Date("2026-10-15T10:45:00.000Z");
    expect(await useCase.execute()).toEqual({ reminded: 0 });

    expect(notifier.reminders).toHaveLength(1);
  });

  it("reminds once when two runs happen at the same moment", async () => {
    const item = classAt();
    const { useCase, notifier } = setup([item]);

    const results = await Promise.all([useCase.execute(), useCase.execute()]);

    expect(results.map((result) => result.reminded).sort((a, b) => a - b)).toEqual([0, 1]);
    expect(notifier.reminders).toHaveLength(1);
  });

  it("tells nobody when another run marked the class first", async () => {
    const item = classAt();
    const { useCase, repository, notifier } = setup([item]);
    repository.markReminded = async () => false;

    expect(await useCase.execute()).toEqual({ reminded: 0 });
    expect(notifier.reminders).toHaveLength(0);
  });

  it("keeps the class marked when the notification fails, and doesn't send it again", async () => {
    const item = classAt();
    const { useCase, repository, notifier, clock } = setup([item]);
    notifier.fail = true;

    expect(await useCase.execute()).toEqual({ reminded: 1 });
    expect((await repository.findById(item.id))!.reminderSentAt).toEqual(AT_0730);

    notifier.fail = false;
    clock.now = new Date("2026-10-15T10:31:00.000Z");
    expect(await useCase.execute()).toEqual({ reminded: 0 });
    expect(notifier.reminders).toHaveLength(1);
  });

  it("never reminds a cancelled class, even one cancelled after its reminder", async () => {
    const cancelled = classAt({ cancelledAt: new Date("2026-10-15T09:00:00.000Z") });
    const remindedThenCancelled = classAt({
      reminderSentAt: AT_0730,
      cancelledAt: new Date("2026-10-15T10:40:00.000Z"),
    });
    const { useCase, notifier } = setup([cancelled, remindedThenCancelled], {
      now: new Date("2026-10-15T10:45:00.000Z"),
    });

    expect(await useCase.execute()).toEqual({ reminded: 0 });
    expect(notifier.reminders).toHaveLength(0);
  });

  it("reminds a class whose start moved, once its mark was cleared", async () => {
    const moved = classAt({
      startsAt: new Date("2026-10-15T13:00:00.000Z"), // 10:00 in Fortaleza
      endsAt: new Date("2026-10-15T14:00:00.000Z"),
    });
    const { useCase, notifier, clock } = setup([moved], { now: new Date("2026-10-15T12:29:00.000Z") });

    expect(await useCase.execute()).toEqual({ reminded: 0 });
    clock.now = new Date("2026-10-15T12:30:00.000Z");
    expect(await useCase.execute()).toEqual({ reminded: 1 });
    expect(notifier.reminders[0].startsAt).toEqual(new Date("2026-10-15T13:00:00.000Z"));
  });

  it("marks a class with nobody to tell without notifying", async () => {
    const item = classAt({ instructorIds: [] });
    const { useCase, repository, notifier } = setup([item]);

    expect(await useCase.execute()).toEqual({ reminded: 1 });

    expect(notifier.reminders).toHaveLength(0);
    expect((await repository.findById(item.id))!.reminderSentAt).toEqual(AT_0730);
  });

  it("leaves a class whose location can't be found due, without marking it", async () => {
    const item = classAt({ locationId: "11111111-1111-4111-8111-111111111111" });
    const { useCase, repository, notifier } = setup([item]);

    expect(await useCase.execute()).toEqual({ reminded: 0 });

    expect(notifier.reminders).toHaveLength(0);
    expect((await repository.findById(item.id))!.reminderSentAt).toBeNull();
  });

  it("marks nothing when the rosters can't be read", async () => {
    const item = classAt();
    const { useCase, repository, rosters } = setup([item]);
    rosters.findRosters = async () => {
      throw new Error("database down");
    };

    await expect(useCase.execute()).rejects.toThrow("database down");
    expect((await repository.findById(item.id))!.reminderSentAt).toBeNull();
  });
});
