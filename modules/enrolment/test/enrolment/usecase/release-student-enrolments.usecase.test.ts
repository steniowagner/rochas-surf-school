import { ReleaseStudentEnrolments } from "../../../src";
import {
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
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

const SECOND_CLASS = "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b";
const STARTED_CLASS = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";
const OTHER_STUDENT = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";

function setup(names: Record<string, string> = { [STUDENT.id]: "Ana Souza" }) {
  const classes = [
    buildEnrolmentClass(),
    buildEnrolmentClass({ id: SECOND_CLASS, cancellationDeadline: null }),
    buildEnrolmentClass({ id: STARTED_CLASS, startsAt: new Date(NOW.getTime() - 1000) }),
  ];
  const enrolments = new FakeEnrolmentRepository(
    [
      buildEnrolment({ status: "approved" }),
      buildEnrolment({ classId: SECOND_CLASS }),
      buildEnrolment({ classId: STARTED_CLASS, status: "approved" }),
      buildEnrolment({ studentId: OTHER_STUDENT }),
    ],
    classes,
  );
  const notifier = new FakeEnrolmentNotifier();
  const useCase = new ReleaseStudentEnrolments(
    enrolments,
    new FakeEnrolmentClassReader(classes),
    new FakeStudentNameReader(names),
    notifier,
    new FakeClockProvider(NOW),
  );

  return { useCase, enrolments, notifier };
}

describe("ReleaseStudentEnrolments", () => {
  it("cancels the upcoming seat past any deadline, withdraws the request and tells once per class", async () => {
    const { useCase, enrolments, notifier } = setup();

    const out = await useCase.execute({ studentId: STUDENT.id });

    expect(out).toEqual({ cancelled: 1, withdrawn: 1 });
    expect(enrolments.all.map((item) => item.status)).toEqual(["cancelled", "withdrawn", "approved", "pending"]);
    expect(notifier.cancelledEvents).toEqual([
      {
        classId: CLASS_ID,
        studentName: "Ana Souza",
        discipline: "surf",
        startsAt: TOMORROW,
        waitingCount: 1,
        instructorIds: [INSTRUCTOR.id],
      },
    ]);
  });

  it("does nothing for a student without enrolments, and when run again", async () => {
    const { useCase, notifier } = setup();

    expect(await useCase.execute({ studentId: "none" })).toEqual({ cancelled: 0, withdrawn: 0 });
    await useCase.execute({ studentId: STUDENT.id });
    notifier.cancelledEvents.length = 0;
    expect(await useCase.execute({ studentId: STUDENT.id })).toEqual({ cancelled: 0, withdrawn: 0 });
    expect(notifier.cancelledEvents).toEqual([]);
  });

  it("keeps the release when the push fails, the name is unknown or the class is gone", async () => {
    const failing = setup();
    failing.notifier.error = new Error("push down");
    const nameless = setup({});

    expect(await failing.useCase.execute({ studentId: STUDENT.id })).toEqual({ cancelled: 1, withdrawn: 1 });
    expect(await nameless.useCase.execute({ studentId: STUDENT.id })).toEqual({ cancelled: 1, withdrawn: 1 });
    expect(nameless.notifier.cancelledEvents).toEqual([]);

    const gone = new ReleaseStudentEnrolments(
      new FakeEnrolmentRepository([buildEnrolment({ status: "approved" })], [buildEnrolmentClass()]),
      new FakeEnrolmentClassReader([]),
      new FakeStudentNameReader({ [STUDENT.id]: "Ana Souza" }),
      new FakeEnrolmentNotifier(),
      new FakeClockProvider(NOW),
    );
    expect(await gone.execute({ studentId: STUDENT.id })).toEqual({ cancelled: 1, withdrawn: 0 });
  });

  it("counts only the seats when the student has no request, and only the requests when no seat", async () => {
    const classes = [buildEnrolmentClass(), buildEnrolmentClass({ id: SECOND_CLASS })];
    const build = (items: ReturnType<typeof buildEnrolment>[]) =>
      new ReleaseStudentEnrolments(
        new FakeEnrolmentRepository(items, classes),
        new FakeEnrolmentClassReader(classes),
        new FakeStudentNameReader({ [STUDENT.id]: "Ana Souza" }),
        new FakeEnrolmentNotifier(),
        new FakeClockProvider(NOW),
      );

    const seatsOnly = build([
      buildEnrolment({ status: "approved" }),
      buildEnrolment({ classId: SECOND_CLASS, status: "approved" }),
    ]);
    const requestsOnly = build([buildEnrolment(), buildEnrolment({ classId: SECOND_CLASS })]);

    expect(await seatsOnly.execute({ studentId: STUDENT.id })).toEqual({ cancelled: 2, withdrawn: 0 });
    expect(await requestsOnly.execute({ studentId: STUDENT.id })).toEqual({ cancelled: 0, withdrawn: 2 });
  });

  it("propagates a failed write", async () => {
    const { useCase, enrolments } = setup();
    jest.spyOn(enrolments, "releaseForStudent").mockRejectedValue(new Error("db down"));

    await expect(useCase.execute({ studentId: STUDENT.id })).rejects.toThrow("db down");
  });
});
