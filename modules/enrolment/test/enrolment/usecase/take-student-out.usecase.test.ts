import { ForbiddenError, NotFoundError, ValidationException } from "@rochas-surf-school/shared";
import { TAKE_OUT_REASON_MAX, TakeStudentOut } from "../../../src";
import {
  ADMIN,
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeEnrolmentNotifier,
  FakeEnrolmentRepository,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

function setup(options: { now?: Date; status?: Parameters<typeof buildEnrolment>[0] } = {}) {
  const stored = buildEnrolment({ status: "approved", ...options.status });
  const found = buildEnrolmentClass();
  const enrolments = new FakeEnrolmentRepository([stored], [found]);
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new TakeStudentOut(
    enrolments,
    new FakeEnrolmentClassReader([found]),
    notifier,
    new FakeClockProvider(options.now ?? NOW),
  );

  return { useCase, enrolments, notifier, stored, input: { actor: ADMIN, id: stored.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("TakeStudentOut", () => {
  it("takes the student out with the trimmed reason and tells them", async () => {
    const { useCase, input, enrolments, notifier, stored } = setup();

    const out = await useCase.execute({ ...input, reason: "  Turma avançada.  " });

    expect(out).toEqual({ id: stored.id, classId: CLASS_ID, status: "takenOut", requestedAt: NOW });
    const saved = (await enrolments.findById(stored.id))!;
    expect(saved.status).toBe("takenOut");
    expect(saved.reason).toBe("Turma avançada.");
    expect(saved.endedAt).toEqual(NOW);
    expect(notifier.takenOutEvents).toEqual([
      { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf", startsAt: TOMORROW, reason: "Turma avançada." },
    ]);
  });

  it.each([[undefined], [null], [""], ["   "]])("stores no reason for %j", async (reason) => {
    const { useCase, input, enrolments, notifier, stored } = setup();

    await useCase.execute({ ...input, reason });

    expect((await enrolments.findById(stored.id))!.reason).toBeNull();
    expect(notifier.takenOutEvents).toEqual([
      { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf", startsAt: TOMORROW },
    ]);
  });

  it("accepts a reason of exactly the limit", async () => {
    const { useCase, input } = setup();

    expect((await useCase.execute({ ...input, reason: "a".repeat(TAKE_OUT_REASON_MAX) })).status).toBe(
      "takenOut",
    );
  });

  it.each([["a".repeat(TAKE_OUT_REASON_MAX + 1)], [42], [{}]])(
    "answers enrolment.reason.max.length for %j",
    async (reason) => {
      const { useCase, input, enrolments, stored } = setup();

      const error = await errorOf(useCase.execute({ ...input, reason }));

      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors.map((item) => item.message)).toEqual([
        "enrolment.reason.max.length",
      ]);
      expect((await enrolments.findById(stored.id))!.status).toBe("approved");
    },
  );

  it("answers even when the push fails", async () => {
    const { useCase, input, notifier } = setup();
    notifier.error = new Error("push down");

    expect((await useCase.execute(input)).status).toBe("takenOut");
  });

  it.each([
    [{ ...ADMIN, status: "removed" as const }, new ForbiddenError("user.status.notApproved")],
    [STUDENT, new ForbiddenError("user.role.notAdmin")],
    [INSTRUCTOR, new ForbiddenError("user.role.notAdmin")],
  ])("refuses %j", async (actor, expected) => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(expected);
  });

  it.each([["not-a-uuid"], [42], ["11111111-1111-4111-8111-111111111111"]])(
    "answers enrolment.notFound for %j",
    async (id) => {
      const { useCase, input } = setup();

      expect(await errorOf(useCase.execute({ ...input, id: id as string }))).toEqual(
        new NotFoundError("enrolment.notFound"),
      );
    },
  );

  it.each(["pending", "denied", "cancelled", "takenOut"] as const)(
    "answers enrolment.notApproved for a %s enrolment",
    async (status) => {
      const { useCase, input, notifier } = setup({ status: { status } });

      expect(await errorOf(useCase.execute(input))).toEqual(
        expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
      );
      expect(notifier.takenOutEvents).toEqual([]);
    },
  );

  it("answers class.started once the class began", async () => {
    const { useCase, input, enrolments, stored } = setup({ now: TOMORROW });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "class.started", statusCode: 409 }),
    );
    expect((await enrolments.findById(stored.id))!.status).toBe("approved");
  });

  it("answers enrolment.notApproved when the seat changed meanwhile", async () => {
    const { useCase, input, enrolments, notifier } = setup();
    jest.spyOn(enrolments, "takeOut").mockResolvedValue(false);

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.notApproved", statusCode: 409 }),
    );
    expect(notifier.takenOutEvents).toEqual([]);
  });
});
