import { NotFoundError } from "@rochas-surf-school/shared";
import { CancelSeat } from "../../../src";
import {
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
  DEADLINE,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeEnrolmentNotifier,
  FakeEnrolmentRepository,
  FakeStudentNameReader,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";

interface Options {
  now?: Date;
  status?: Parameters<typeof buildEnrolment>[0];
  found?: Parameters<typeof buildEnrolmentClass>[0] | null;
  names?: Record<string, string>;
}

function setup(options: Options = {}) {
  const stored = buildEnrolment({ status: "approved", ...options.status });
  const waiting = [
    buildEnrolment({ studentId: OTHER_STUDENT }),
    buildEnrolment({ studentId: "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b" }),
  ];
  const enrolments = new FakeEnrolmentRepository([stored, ...waiting]);
  const classes = new FakeEnrolmentClassReader(
    options.found === null ? [] : [buildEnrolmentClass(options.found)],
  );
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new CancelSeat(
    enrolments,
    classes,
    new FakeStudentNameReader(options.names ?? { [STUDENT.id]: "Ana Souza" }),
    notifier,
    new FakeClockProvider(options.now ?? NOW),
  );

  return { useCase, enrolments, notifier, stored, input: { actor: STUDENT, id: stored.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("CancelSeat", () => {
  it("cancels an approved seat before the deadline and tells admins and instructors", async () => {
    const { useCase, input, enrolments, notifier, stored } = setup();

    const out = await useCase.execute(input);

    expect(out).toEqual({ id: stored.id, classId: CLASS_ID, status: "cancelled", requestedAt: NOW });
    const saved = (await enrolments.findById(stored.id))!;
    expect(saved.status).toBe("cancelled");
    expect(saved.endedAt).toEqual(NOW);
    expect(notifier.cancelledEvents).toEqual([
      {
        classId: CLASS_ID,
        studentName: "Ana Souza",
        discipline: "surf",
        startsAt: TOMORROW,
        waitingCount: 2,
        instructorIds: [INSTRUCTOR.id],
      },
    ]);
  });

  it("answers a second cancel with enrolment.notApproved", async () => {
    const { useCase, input } = setup();

    await useCase.execute(input);

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
    );
  });

  it("answers the cancellation even when the push fails or the name is unknown", async () => {
    const failing = setup();
    failing.notifier.error = new Error("push down");
    const nameless = setup({ names: {} });

    expect((await failing.useCase.execute(failing.input)).status).toBe("cancelled");
    expect((await nameless.useCase.execute(nameless.input)).status).toBe("cancelled");
    expect(nameless.notifier.cancelledEvents).toEqual([]);
  });

  it("refuses a non-approved account", async () => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor: { ...STUDENT, status: "removed" } }))).toEqual(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it.each([["nope"], [42], [undefined]])("refuses the id %j with enrolment.notFound", async (id) => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, id: id as string }))).toEqual(
      new NotFoundError("enrolment.notFound"),
    );
  });

  it("refuses another student's enrolment, a missing one and a missing class with enrolment.notFound", async () => {
    const { useCase, input, notifier } = setup();
    const gone = setup({ found: null });

    expect(await errorOf(useCase.execute({ ...input, actor: { ...STUDENT, id: OTHER_STUDENT } }))).toEqual(
      new NotFoundError("enrolment.notFound"),
    );
    expect(
      await errorOf(useCase.execute({ ...input, id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f" })),
    ).toEqual(new NotFoundError("enrolment.notFound"));
    expect(await errorOf(gone.useCase.execute(gone.input))).toEqual(new NotFoundError("enrolment.notFound"));
    expect(notifier.cancelledEvents).toEqual([]);
  });

  it.each(["pending", "denied", "withdrawn", "expired", "cancelled", "takenOut", "classCancelled"] as const)(
    "refuses a %s enrolment with enrolment.notApproved",
    async (status) => {
      const { useCase, input, notifier } = setup({ status: { status } });

      expect(await errorOf(useCase.execute(input))).toEqual(
        expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
      );
      expect(notifier.cancelledEvents).toEqual([]);
    },
  );

  it("refuses once the class started, before looking at the deadline", async () => {
    const { useCase, input, enrolments, stored } = setup({
      now: TOMORROW,
      found: { cancellationDeadline: null },
    });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "class.started", statusCode: 409 }),
    );
    expect((await enrolments.findById(stored.id))!.status).toBe("approved");
  });

  it("refuses a class without a deadline with enrolment.deadline.missing", async () => {
    const { useCase, input, notifier } = setup({ found: { cancellationDeadline: null } });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.deadline.missing", statusCode: 409 }),
    );
    expect(notifier.cancelledEvents).toEqual([]);
  });

  it("refuses at the deadline and after it, but not a millisecond before", async () => {
    const at = setup({ now: DEADLINE });
    const after = setup({ now: new Date(DEADLINE.getTime() + 1) });
    const before = setup({ now: new Date(DEADLINE.getTime() - 1) });

    for (const refused of [at, after]) {
      expect(await errorOf(refused.useCase.execute(refused.input))).toEqual(
        expect.objectContaining({ message: "enrolment.deadline.passed", statusCode: 409 }),
      );
      expect((await refused.enrolments.findById(refused.stored.id))!.status).toBe("approved");
      expect(refused.notifier.cancelledEvents).toEqual([]);
    }
    expect((await before.useCase.execute(before.input)).status).toBe("cancelled");
  });

  it("answers enrolment.notApproved when the seat was cancelled meanwhile", async () => {
    const { useCase, input, enrolments } = setup();
    jest.spyOn(enrolments, "cancel").mockResolvedValue(false);

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
    );
  });
});
