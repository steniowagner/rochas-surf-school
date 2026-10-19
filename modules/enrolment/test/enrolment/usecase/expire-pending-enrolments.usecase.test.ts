import { ExpirePendingEnrolments } from "../../../src";
import {
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentNotifier,
  FakeEnrolmentRepository,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";
const FUTURE_CLASS = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const CANCELLED_CLASS = "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b";
const AFTER_START = new Date(TOMORROW.getTime() + 60 * 1000);

function setup() {
  const classes = [
    buildEnrolmentClass(),
    buildEnrolmentClass({ id: FUTURE_CLASS, startsAt: new Date(TOMORROW.getTime() + 86_400_000) }),
    buildEnrolmentClass({ id: CANCELLED_CLASS, cancelledAt: NOW }),
  ];
  const enrolments = new FakeEnrolmentRepository(
    [
      buildEnrolment(),
      buildEnrolment({ studentId: OTHER_STUDENT }),
      buildEnrolment({ classId: FUTURE_CLASS }),
      buildEnrolment({ classId: CANCELLED_CLASS }),
      buildEnrolment({ studentId: "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d", status: "withdrawn" }),
    ],
    classes,
  );
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new ExpirePendingEnrolments(enrolments, notifier, new FakeClockProvider(AFTER_START));

  return { useCase, enrolments, notifier };
}

describe("ExpirePendingEnrolments", () => {
  it("expires the pending requests of a started class and tells their students once", async () => {
    const { useCase, enrolments, notifier } = setup();

    expect(await useCase.execute()).toEqual({ expired: 2 });

    expect(enrolments.all.map((item) => item.status)).toEqual([
      "expired",
      "expired",
      "pending",
      "pending",
      "withdrawn",
    ]);
    expect(notifier.expiredEvents).toEqual([
      { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf", startsAt: TOMORROW },
      { studentId: OTHER_STUDENT, classId: CLASS_ID, discipline: "surf", startsAt: TOMORROW },
    ]);
  });

  it("sends nothing more when it runs again", async () => {
    const { useCase, notifier } = setup();

    await useCase.execute();

    expect(await useCase.execute()).toEqual({ expired: 0 });
    expect(notifier.expiredEvents).toHaveLength(2);
  });

  it("leaves everything pending before the class starts", async () => {
    const { enrolments, notifier } = setup();
    const useCase = new ExpirePendingEnrolments(
      enrolments,
      notifier,
      new FakeClockProvider(new Date(TOMORROW.getTime() - 1)),
    );

    expect(await useCase.execute()).toEqual({ expired: 0 });
    expect(notifier.expiredEvents).toEqual([]);
  });

  it("skips a request that stopped being pending since it was read", async () => {
    const { useCase, enrolments, notifier } = setup();
    enrolments.expire = async () => false;

    expect(await useCase.execute()).toEqual({ expired: 0 });
    expect(notifier.expiredEvents).toEqual([]);
  });

  it("keeps the requests expired when the notifier fails", async () => {
    const { useCase, enrolments, notifier } = setup();
    notifier.error = new Error("push down");

    expect(await useCase.execute()).toEqual({ expired: 2 });
    expect(enrolments.all.filter((item) => item.status === "expired")).toHaveLength(2);
  });
});
