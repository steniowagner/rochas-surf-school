import { ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { ApproveRequest } from "../../../src";
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

const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";

function setup(
  options: { now?: Date; status?: Parameters<typeof buildEnrolment>[0]; capacity?: number; taken?: number } = {},
) {
  const stored = buildEnrolment(options.status);
  const seated = Array.from({ length: options.taken ?? 0 }, (_, index) =>
    buildEnrolment({ studentId: `00000000-0000-4000-8000-00000000000${index}`, status: "approved" }),
  );
  const found = buildEnrolmentClass({ capacity: options.capacity ?? 8 });
  const enrolments = new FakeEnrolmentRepository([stored, ...seated], [found]);
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new ApproveRequest(
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

describe("ApproveRequest", () => {
  it("approves a pending request while there is a free seat and tells the student", async () => {
    const { useCase, input, enrolments, notifier, stored } = setup({ capacity: 2, taken: 1 });

    const out = await useCase.execute(input);

    expect(out).toEqual({ id: stored.id, classId: CLASS_ID, status: "approved", requestedAt: NOW });
    const saved = (await enrolments.findById(stored.id))!;
    expect(saved.status).toBe("approved");
    expect(saved.decidedAt).toEqual(NOW);
    expect(notifier.approvedEvents).toEqual([
      { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf", startsAt: TOMORROW },
    ]);
  });

  it("answers the approval even when the push fails", async () => {
    const { useCase, input, notifier, enrolments, stored } = setup();
    notifier.error = new Error("push down");

    expect((await useCase.execute(input)).status).toBe("approved");
    expect((await enrolments.findById(stored.id))!.status).toBe("approved");
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

  it("answers enrolment.notFound when the class is gone", async () => {
    const stored = buildEnrolment();
    const useCase = new ApproveRequest(
      new FakeEnrolmentRepository([stored]),
      new FakeEnrolmentClassReader([]),
      new FakeEnrolmentNotifier(),
      new FakeClockProvider(NOW),
    );

    expect(await errorOf(useCase.execute({ actor: ADMIN, id: stored.id }))).toEqual(
      new NotFoundError("enrolment.notFound"),
    );
  });

  it.each(["approved", "denied", "withdrawn", "expired"] as const)(
    "answers enrolment.notPending for a %s request",
    async (status) => {
      const { useCase, input, notifier } = setup({ status: { status } });

      expect(await errorOf(useCase.execute(input))).toEqual(
        expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
      );
      expect(notifier.approvedEvents).toEqual([]);
    },
  );

  it("answers class.started once the class began", async () => {
    const { useCase, input, enrolments, stored } = setup({ now: TOMORROW });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "class.started", statusCode: 409 }),
    );
    expect((await enrolments.findById(stored.id))!.status).toBe("pending");
  });

  it("answers enrolment.class.full when the seats are taken", async () => {
    const { useCase, input, notifier, enrolments, stored } = setup({ capacity: 1, taken: 1 });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.class.full", statusCode: 409 }),
    );
    expect((await enrolments.findById(stored.id))!.status).toBe("pending");
    expect(notifier.approvedEvents).toEqual([]);
  });

  it("answers enrolment.notPending when the request was decided meanwhile", async () => {
    const { useCase, input, enrolments } = setup();
    jest.spyOn(enrolments, "approve").mockResolvedValue("notPending");

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.notPending", statusCode: 409 }),
    );
  });

  it("is not blocked by another student's request", async () => {
    const { useCase, input } = setup({ status: { studentId: OTHER_STUDENT } });

    expect((await useCase.execute(input)).status).toBe("approved");
  });
});
