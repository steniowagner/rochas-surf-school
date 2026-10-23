import {
  deadlineBackoffMinutes,
  WorkOutCancellationDeadlines,
} from "../../../src";
import {
  ADMIN,
  buildCancellationRule,
  buildClass,
  buildLocation,
  FakeCancellationDeadlineDescriber,
  FakeCancellationRuleRepository,
  FakeLocationRepository,
  FakeSchoolClassRepository,
  INSTRUCTOR_ID,
} from "../../mock";

const NOW = new Date("2026-10-18T12:00:00.000Z");
const RULE = "O aluno pode cancelar até 12 horas antes do início da aula.";
const location = buildLocation("Praia do Futuro", "Av. Zezé Diogo, s/n");

function surfClass(date: string, overrides: Parameters<typeof buildClass>[0] = {}) {
  return buildClass({
    startsAt: new Date(`${date}T11:00:00.000Z`), // 08:00 in Fortaleza
    endsAt: new Date(`${date}T12:00:00.000Z`),
    locationId: location.id,
    ...overrides,
  });
}

function setup(
  classes: ReturnType<typeof buildClass>[],
  options: { rules?: ReturnType<typeof buildCancellationRule>[]; now?: Date } = {},
) {
  const repository = new FakeSchoolClassRepository(classes);
  const describer = new FakeCancellationDeadlineDescriber();
  const clock = { now: options.now ?? NOW };
  const useCase = new WorkOutCancellationDeadlines(
    repository,
    new FakeCancellationRuleRepository(options.rules ?? [buildCancellationRule({ text: RULE })]),
    new FakeLocationRepository([location]),
    describer,
    { now: () => new Date(clock.now.getTime()) },
  );

  return { useCase, repository, describer, clock };
}

describe("deadlineBackoffMinutes", () => {
  it("doubles from one minute up to an hour", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map(deadlineBackoffMinutes)).toEqual([1, 2, 4, 8, 16, 32, 60, 60, 60]);
  });
});

describe("WorkOutCancellationDeadlines", () => {
  it("stores the computed deadline and resets the attempts", async () => {
    const item = surfClass("2026-10-20", { deadlineAttempts: 2 });
    const { useCase, repository, describer } = setup([item]);

    expect(await useCase.execute()).toEqual({ workedOut: 1, failed: 0 });

    const saved = (await repository.findById(item.id))!;
    expect(saved.cancellationDeadline!.toISOString()).toBe("2026-10-19T23:00:00.000Z");
    expect(saved.deadlineAttempts).toBe(0);
    expect(describer.requests).toHaveLength(1);

    await useCase.execute();
    expect(describer.requests).toHaveLength(1);
  });

  it("sends only the rule and the class's details", async () => {
    const item = surfClass("2026-10-20", { notes: "Trazer protetor solar.", instructorIds: [INSTRUCTOR_ID] });
    const { useCase, describer } = setup([item]);

    await useCase.execute();

    expect(describer.requests).toEqual([
      {
        rule: RULE,
        class: {
          discipline: "surf",
          level: "beginner",
          date: "2026-10-20",
          weekday: "Tuesday",
          start: "08:00",
          end: "09:00",
          locationName: "Praia do Futuro",
          locationAddress: "Av. Zezé Diogo, s/n",
          capacity: 8,
          notes: "Trazer protetor solar.",
        },
      },
    ]);
    const sent = JSON.stringify(describer.requests);
    expect(sent).not.toContain(item.id);
    expect(sent).not.toContain(INSTRUCTOR_ID);
    expect(sent).not.toContain(ADMIN.id);
  });

  it("sends notes as null when the class has none", async () => {
    const { useCase, describer } = setup([surfClass("2026-10-20")]);

    await useCase.execute();

    expect(describer.requests[0].class.notes).toBeNull();
  });

  describe("no rule", () => {
    it("never calls the describer for a discipline without a rule and counts no attempt", async () => {
      const skate = surfClass("2026-10-20", { discipline: "skate" });
      const { useCase, repository, describer } = setup([skate]);

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });

      expect(describer.requests).toHaveLength(0);
      expect((await repository.findById(skate.id))!.deadlineAttempts).toBe(0);
    });

    it("does nothing at all without any rule", async () => {
      const { useCase, describer } = setup([surfClass("2026-10-20")], { rules: [] });

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });
      expect(describer.requests).toHaveLength(0);
    });
  });

  describe("failures", () => {
    it("backs off 1, 2, 4, 8, 16, 32 and then 60 minutes, then stores the deadline", async () => {
      const item = surfClass("2026-12-20");
      const { useCase, repository, describer, clock } = setup([item]);
      describer.answer = { kind: "unclear" };
      const waits: number[] = [];

      for (let run = 0; run < 7; run += 1) {
        expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 1 });

        const saved = (await repository.findById(item.id))!;
        expect(saved.cancellationDeadline).toBeNull();
        expect(saved.deadlineAttempts).toBe(run + 1);
        waits.push((saved.deadlineNextAttemptAt!.getTime() - clock.now.getTime()) / 60_000);

        // not due one minute short of the wait
        clock.now = new Date(saved.deadlineNextAttemptAt!.getTime() - 1);
        const calls = describer.requests.length;
        expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });
        expect(describer.requests).toHaveLength(calls);

        clock.now = saved.deadlineNextAttemptAt!;
      }

      expect(waits).toEqual([1, 2, 4, 8, 16, 32, 60]);

      describer.answer = { kind: "minutesBefore", minutes: 60 };
      expect(await useCase.execute()).toEqual({ workedOut: 1, failed: 0 });

      const saved = (await repository.findById(item.id))!;
      expect(saved.cancellationDeadline).not.toBeNull();
      expect(saved.deadlineAttempts).toBe(0);
    });

    it.each([
      ["a describer that throws", async () => Promise.reject(new Error("down"))],
      ["an out-of-range answer", async () => ({ kind: "minutesBefore", minutes: -5 }) as never],
      ["an answer that isn't a description", async () => undefined as never],
    ])("counts %s as a failed attempt", async (_name, answer) => {
      const item = surfClass("2026-10-20");
      const { useCase, repository, describer } = setup([item]);
      describer.answer = answer;

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 1 });
      expect((await repository.findById(item.id))!.deadlineAttempts).toBe(1);
    });

    it("counts a class whose location is gone as a failed attempt", async () => {
      const item = buildClass({ startsAt: new Date("2026-10-20T11:00:00.000Z"), endsAt: new Date("2026-10-20T12:00:00.000Z") });
      const { useCase, describer } = setup([item]);

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 1 });
      expect(describer.requests).toHaveLength(0);
    });
  });

  describe("which classes", () => {
    it("never picks a class that started, was cancelled or has a deadline", async () => {
      const { useCase, describer } = setup([
        surfClass("2026-10-18", { startsAt: new Date("2026-10-18T11:00:00.000Z"), endsAt: new Date("2026-10-18T12:30:00.000Z") }),
        surfClass("2026-10-20", { cancelledAt: new Date("2026-10-17T10:00:00.000Z") }),
        surfClass("2026-10-21", { cancellationDeadline: new Date("2026-10-20T10:00:00.000Z") }),
      ]);

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });
      expect(describer.requests).toHaveLength(0);
    });

    it("picks 20 per run, the never-tried first and then by start", async () => {
      const days = Array.from({ length: 25 }, (_, index) => `2026-11-${String(index + 1).padStart(2, "0")}`);
      const retried = surfClass("2026-10-20", { deadlineAttempts: 1, deadlineNextAttemptAt: new Date("2026-10-18T11:00:00.000Z") });
      const { useCase, repository, describer } = setup([retried, ...days.map((day) => surfClass(day))]);

      expect(await useCase.execute()).toEqual({ workedOut: 20, failed: 0 });

      const sent = describer.requests.map((request) => request.class.date);
      expect(sent).toHaveLength(20);
      expect(sent).not.toContain("2026-10-20");
      expect(new Set(sent)).toEqual(new Set(days.slice(0, 20)));

      expect(await useCase.execute()).toEqual({ workedOut: 6, failed: 0 });
      expect((await repository.findById(retried.id))!.cancellationDeadline).not.toBeNull();
    });

    it("describes five at a time", async () => {
      const { useCase, describer } = setup(
        Array.from({ length: 12 }, (_, index) => surfClass(`2026-11-${String(index + 1).padStart(2, "0")}`)),
      );
      let running = 0;
      let peak = 0;
      describer.answer = async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running -= 1;

        return { kind: "classStart" };
      };

      await useCase.execute();

      expect(peak).toBe(5);
    });
  });

  describe("stale", () => {
    it("drops a result when the class was edited during the call", async () => {
      const item = surfClass("2026-10-20");
      const { useCase, repository, describer } = setup([item]);
      describer.answer = async () => {
        await repository.update(item.clone({ capacity: 5 }), { clearDeadline: true });

        return { kind: "minutesBefore", minutes: 60 };
      };

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });

      const saved = (await repository.findById(item.id))!;
      expect(saved.cancellationDeadline).toBeNull();
      expect(saved.deadlineRevision).toBe(1);
      expect(saved.deadlineAttempts).toBe(0);
    });

    it("drops a failure when the class was edited during the call", async () => {
      const item = surfClass("2026-10-20");
      const { useCase, repository, describer } = setup([item]);
      describer.answer = async () => {
        await repository.update(item.clone({ capacity: 5 }), { clearDeadline: true });

        return { kind: "unclear" };
      };

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });
      expect((await repository.findById(item.id))!.deadlineAttempts).toBe(0);
    });

    it("drops a result when the class was cancelled during the call", async () => {
      const item = surfClass("2026-10-20");
      const { useCase, repository, describer } = setup([item]);
      describer.answer = async () => {
        await repository.cancel(item.id, NOW, null);

        return { kind: "classStart" };
      };

      expect(await useCase.execute()).toEqual({ workedOut: 0, failed: 0 });
      expect((await repository.findById(item.id))!.cancellationDeadline).toBeNull();
    });
  });
});
