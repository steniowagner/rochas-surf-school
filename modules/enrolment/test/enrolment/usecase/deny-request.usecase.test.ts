import { NotFoundError, ValidationException } from "@rochas-surf-school/shared";
import { DenyRequest, ENROLMENT_REASON_MAX } from "../../../src";
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

function setup(options: { now?: Date; status?: Parameters<typeof buildEnrolment>[0]; capacity?: number } = {}) {
  const stored = buildEnrolment(options.status);
  const found = buildEnrolmentClass({ capacity: options.capacity ?? 8 });
  const enrolments = new FakeEnrolmentRepository([stored], [found]);
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new DenyRequest(
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

describe("DenyRequest", () => {
  it("denies with the reason trimmed and tells the student with it", async () => {
    const { useCase, input, enrolments, notifier, stored } = setup();

    const out = await useCase.execute({ ...input, reason: "  Esta aula é de nível avançado.  " });

    expect(out).toEqual({ id: stored.id, classId: CLASS_ID, status: "denied", requestedAt: NOW });
    const saved = (await enrolments.findById(stored.id))!;
    expect(saved.status).toBe("denied");
    expect(saved.reason).toBe("Esta aula é de nível avançado.");
    expect(notifier.deniedEvents).toEqual([
      {
        studentId: STUDENT.id,
        classId: CLASS_ID,
        discipline: "surf",
        startsAt: TOMORROW,
        reason: "Esta aula é de nível avançado.",
      },
    ]);
  });

  it.each([[undefined], [null], [""], ["   "]])("stores no reason for %j", async (reason) => {
    const { useCase, input, enrolments, notifier, stored } = setup();

    await useCase.execute({ ...input, reason });

    expect((await enrolments.findById(stored.id))!.reason).toBeNull();
    expect(notifier.deniedEvents[0]).not.toHaveProperty("reason");
  });

  it("accepts a reason at the limit and refuses one above it, or not a string", async () => {
    const { useCase, input } = setup();

    await expect(useCase.execute({ ...input, reason: "a".repeat(ENROLMENT_REASON_MAX) })).resolves.toBeDefined();

    for (const reason of ["a".repeat(ENROLMENT_REASON_MAX + 1), 42, {}]) {
      const fresh = setup();
      const error = await errorOf(fresh.useCase.execute({ ...fresh.input, reason }));

      expect(error).toBeInstanceOf(ValidationException);
      expect((error as ValidationException).errors.map((item) => item.message)).toEqual([
        "enrolment.reason.max.length",
      ]);
    }
  });

  it("checks the reason after the id and before the state", async () => {
    const { useCase, input } = setup({ status: { status: "approved" } });
    const tooLong = "a".repeat(ENROLMENT_REASON_MAX + 1);

    expect(await errorOf(useCase.execute({ ...input, reason: tooLong }))).toBeInstanceOf(ValidationException);
    expect(await errorOf(useCase.execute({ ...input, id: "nope", reason: tooLong }))).toEqual(
      new NotFoundError("enrolment.notFound"),
    );
  });

  it("denies a full class too", async () => {
    const { useCase, input } = setup({ capacity: 1 });

    expect((await useCase.execute(input)).status).toBe("denied");
  });

  it("answers the denial even when the push fails", async () => {
    const { useCase, input, notifier } = setup();
    notifier.error = new Error("push down");

    expect((await useCase.execute(input)).status).toBe("denied");
  });

  it.each([[STUDENT], [INSTRUCTOR], [{ ...ADMIN, status: "removed" as const }]])("refuses %j", async (actor) => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(
      expect.objectContaining({ statusCode: 403 }),
    );
  });

  it("answers enrolment.notFound when the class is gone", async () => {
    const stored = buildEnrolment();
    const useCase = new DenyRequest(
      new FakeEnrolmentRepository([stored]),
      new FakeEnrolmentClassReader([]),
      new FakeEnrolmentNotifier(),
      new FakeClockProvider(NOW),
    );

    expect(await errorOf(useCase.execute({ actor: ADMIN, id: stored.id }))).toEqual(
      new NotFoundError("enrolment.notFound"),
    );
  });

  it("answers enrolment.notPending for a decided request and class.started after the start", async () => {
    const decided = setup({ status: { status: "approved" } });
    const started = setup({ now: TOMORROW });

    expect(await errorOf(decided.useCase.execute(decided.input))).toEqual(
      expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
    );
    expect(await errorOf(started.useCase.execute(started.input))).toEqual(
      expect.objectContaining({ message: "class.started", statusCode: 409 }),
    );
    expect(decided.notifier.deniedEvents).toEqual([]);
  });

  it("answers enrolment.notPending when the request was decided meanwhile", async () => {
    const { useCase, input, enrolments } = setup();
    jest.spyOn(enrolments, "deny").mockResolvedValue(false);

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
    );
  });
});
