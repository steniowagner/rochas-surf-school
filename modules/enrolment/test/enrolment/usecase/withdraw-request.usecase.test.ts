import { ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { WithdrawRequest } from "../../../src";
import {
  buildEnrolment,
  buildEnrolmentClass,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeEnrolmentRepository,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";

function setup(options: { now?: Date; status?: Parameters<typeof buildEnrolment>[0] } = {}) {
  const stored = buildEnrolment(options.status);
  const enrolments = new FakeEnrolmentRepository([stored]);
  const classes = new FakeEnrolmentClassReader([buildEnrolmentClass()]);
  const useCase = new WithdrawRequest(enrolments, classes, new FakeClockProvider(options.now ?? NOW));

  return { useCase, enrolments, stored, input: { actor: STUDENT, id: stored.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("WithdrawRequest", () => {
  it("withdraws a pending request of a class that hasn't started", async () => {
    const { useCase, input, enrolments, stored } = setup();

    const out = await useCase.execute(input);

    expect(out).toEqual({ id: stored.id, classId: stored.classId, status: "withdrawn", requestedAt: NOW });
    const saved = (await enrolments.findById(stored.id))!;
    expect(saved.status).toBe("withdrawn");
    expect(saved.endedAt).toEqual(NOW);
  });

  it("refuses an account that isn't approved", async () => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor: { ...STUDENT, status: "removed" } }))).toEqual(
      new ForbiddenError("user.status.notApproved"),
    );
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

  it.each([[{ ...STUDENT, id: OTHER_STUDENT }], [INSTRUCTOR]])(
    "answers enrolment.notFound for another person's enrolment (%j)",
    async (actor) => {
      const { useCase, input, enrolments, stored } = setup();

      expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(
        new NotFoundError("enrolment.notFound"),
      );
      expect((await enrolments.findById(stored.id))!.status).toBe("pending");
    },
  );

  it("answers enrolment.notFound when the class is gone", async () => {
    const stored = buildEnrolment();
    const useCase = new WithdrawRequest(
      new FakeEnrolmentRepository([stored]),
      new FakeEnrolmentClassReader([]),
      new FakeClockProvider(NOW),
    );

    expect(await errorOf(useCase.execute({ actor: STUDENT, id: stored.id }))).toEqual(
      new NotFoundError("enrolment.notFound"),
    );
  });

  it.each(["approved", "denied", "withdrawn", "expired", "cancelled", "takenOut", "classCancelled"] as const)(
    "refuses a %s enrolment",
    async (status) => {
      const { useCase, input } = setup({ status: { status } });

      expect(await errorOf(useCase.execute(input))).toMatchObject({
        message: "enrolment.notPending",
        statusCode: 409,
      });
    },
  );

  it("refuses a class that has started, counting from its start instant", async () => {
    const { useCase, input, enrolments, stored } = setup({ now: TOMORROW });

    expect(await errorOf(useCase.execute(input))).toMatchObject({ message: "class.started", statusCode: 409 });
    expect((await enrolments.findById(stored.id))!.status).toBe("pending");
  });

  it("answers enrolment.notPending when a concurrent withdraw won", async () => {
    const { useCase, input, enrolments } = setup();
    enrolments.withdraw = async () => false;

    expect(await errorOf(useCase.execute(input))).toMatchObject({
      message: "enrolment.notPending",
      statusCode: 409,
    });
  });
});
