import { ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { EnrolStudent } from "../../../src";
import {
  ADMIN,
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeEnrolmentNotifier,
  FakeEnrolmentRepository,
  FakeStudentLookup,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";
const EVENT = { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf", startsAt: TOMORROW };

function setup(
  options: {
    now?: Date;
    capacity?: number;
    cancelledAt?: Date | null;
    enrolments?: ReturnType<typeof buildEnrolment>[];
    students?: string[];
  } = {},
) {
  const found = buildEnrolmentClass({
    capacity: options.capacity ?? 8,
    cancelledAt: options.cancelledAt ?? null,
  });
  const enrolments = new FakeEnrolmentRepository(options.enrolments ?? [], [found]);
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new EnrolStudent(
    enrolments,
    new FakeEnrolmentClassReader([found]),
    new FakeStudentLookup(options.students ?? [STUDENT.id]),
    notifier,
    new FakeClockProvider(options.now ?? NOW),
  );

  return { useCase, enrolments, notifier, input: { actor: ADMIN, classId: CLASS_ID, studentId: STUDENT.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("EnrolStudent", () => {
  it("stores an approved enrolment and tells the student", async () => {
    const { useCase, input, enrolments, notifier } = setup();

    const out = await useCase.execute(input);

    expect(out.created).toBe(true);
    expect(out.enrolment).toEqual({ id: expect.any(String), classId: CLASS_ID, status: "approved", requestedAt: NOW });
    const saved = (await enrolments.findById(out.enrolment.id))!;
    expect(saved.status).toBe("approved");
    expect(saved.ruleAcceptedAt).toBeNull();
    expect(saved.decidedAt).toEqual(NOW);
    expect(notifier.enrolledEvents).toEqual([EVENT]);
    expect(notifier.approvedEvents).toEqual([]);
  });

  it("approves the pending request of the student and tells them it was approved", async () => {
    const pending = buildEnrolment();
    const { useCase, input, enrolments, notifier } = setup({ enrolments: [pending] });

    const out = await useCase.execute(input);

    expect(out.created).toBe(false);
    expect(out.enrolment.id).toBe(pending.id);
    expect(out.enrolment.status).toBe("approved");
    expect(enrolments.all).toHaveLength(1);
    expect(notifier.approvedEvents).toEqual([EVENT]);
    expect(notifier.enrolledEvents).toEqual([]);
  });

  it("takes the last seat", async () => {
    const other = buildEnrolment({ studentId: OTHER_STUDENT, status: "approved" });
    const { useCase, input } = setup({ capacity: 2, enrolments: [other] });

    expect((await useCase.execute(input)).enrolment.status).toBe("approved");
  });

  it("answers even when the push fails", async () => {
    const { useCase, input, notifier, enrolments } = setup();
    notifier.error = new Error("push down");

    const out = await useCase.execute(input);

    expect(out.enrolment.status).toBe("approved");
    expect(enrolments.all).toHaveLength(1);
  });

  it.each([
    [{ ...ADMIN, status: "removed" as const }, new ForbiddenError("user.status.notApproved")],
    [STUDENT, new ForbiddenError("user.role.notAdmin")],
    [INSTRUCTOR, new ForbiddenError("user.role.notAdmin")],
  ])("refuses %j", async (actor, expected) => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(expected);
  });

  it.each([["not-a-uuid"], [7], ["11111111-1111-4111-8111-111111111111"]])(
    "answers class.notFound for %j",
    async (classId) => {
      const { useCase, input } = setup();

      expect(await errorOf(useCase.execute({ ...input, classId: classId as string }))).toEqual(
        new NotFoundError("class.notFound"),
      );
    },
  );

  it.each([[undefined], [null], [7], ["not-a-uuid"], [OTHER_STUDENT]])(
    "answers enrolment.student.invalid for %j",
    async (studentId) => {
      const { useCase, input, enrolments } = setup();

      expect(await errorOf(useCase.execute({ ...input, studentId }))).toEqual(
        expect.objectContaining({ message: "enrolment.student.invalid", statusCode: 422 }),
      );
      expect(enrolments.all).toEqual([]);
    },
  );

  it("answers class.cancelled for a cancelled class", async () => {
    const { useCase, input, enrolments } = setup({ cancelledAt: NOW });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "class.cancelled", statusCode: 409 }),
    );
    expect(enrolments.all).toEqual([]);
  });

  it("answers class.started once the class began", async () => {
    const { useCase, input, enrolments } = setup({ now: TOMORROW });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "class.started", statusCode: 409 }),
    );
    expect(enrolments.all).toEqual([]);
  });

  it("answers enrolment.alreadyApproved when the student holds a seat, even on a full class", async () => {
    const seat = buildEnrolment({ status: "approved" });
    const { useCase, input, notifier } = setup({ capacity: 1, enrolments: [seat] });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.alreadyApproved", statusCode: 409 }),
    );
    expect(notifier.enrolledEvents).toEqual([]);
  });

  it("answers enrolment.class.full when the seats are taken and leaves the pending request", async () => {
    const pending = buildEnrolment();
    const other = buildEnrolment({ studentId: OTHER_STUDENT, status: "approved" });
    const { useCase, input, enrolments, notifier } = setup({ capacity: 1, enrolments: [pending, other] });

    expect(await errorOf(useCase.execute(input))).toEqual(
      expect.objectContaining({ message: "enrolment.class.full", statusCode: 409 }),
    );
    expect((await enrolments.findById(pending.id))!.status).toBe("pending");
    expect(notifier.enrolledEvents).toEqual([]);
    expect(notifier.approvedEvents).toEqual([]);
  });
});
