import { ConflictError } from "@rochas-surf-school/shared";
import {
  buildEnrolment,
  buildEnrolmentClass,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeEnrolmentNotifier,
  FakeEnrolmentRepository,
  FakeStudentNameReader,
  NOW,
  STUDENT,
  TOMORROW,
} from ".";

const OTHER_CLASS = "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

describe("FakeEnrolmentRepository", () => {
  it("stores enrolments and finds them by id", async () => {
    const repository = new FakeEnrolmentRepository();
    const enrolment = buildEnrolment();

    expect(await repository.create(enrolment)).toBe(enrolment);
    expect(await repository.findById(enrolment.id)).toBe(enrolment);
    expect(await repository.findById("missing")).toBeNull();
    expect(repository.all).toEqual([enrolment]);
  });

  it("allows one open enrolment per student and class, and new rows after one ended", async () => {
    const repository = new FakeEnrolmentRepository([buildEnrolment()]);

    await expect(repository.create(buildEnrolment())).rejects.toEqual(
      new ConflictError("enrolment.alreadyOpen"),
    );

    await repository.create(buildEnrolment({ classId: OTHER_CLASS }));
    await repository.create(buildEnrolment({ status: "withdrawn" }));
    expect(repository.all).toHaveLength(3);

    await repository.withdraw(repository.all[0].id, NOW);
    await expect(repository.create(buildEnrolment())).resolves.toBeDefined();
  });

  it("fails the next create when asked to", async () => {
    const repository = new FakeEnrolmentRepository();
    repository.createError = new Error("boom");

    await expect(repository.create(buildEnrolment())).rejects.toThrow("boom");
  });

  it("withdraws and expires only pending enrolments", async () => {
    const pending = buildEnrolment();
    const ended = buildEnrolment({ status: "expired" });
    const repository = new FakeEnrolmentRepository([pending, ended]);

    expect(await repository.withdraw(pending.id, NOW)).toBe(true);
    expect((await repository.findById(pending.id))?.status).toBe("withdrawn");
    expect(await repository.withdraw(pending.id, NOW)).toBe(false);
    expect(await repository.expire(ended.id, NOW)).toBe(false);
    expect(await repository.expire("missing", NOW)).toBe(false);

    const another = buildEnrolment({ studentId: "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b" });
    await repository.create(another);
    expect(await repository.expire(another.id, NOW)).toBe(true);
    expect((await repository.findById(another.id))?.status).toBe("expired");
  });

  it("finds the pending enrolments of started, not cancelled classes", async () => {
    const started = buildEnrolmentClass({ startsAt: new Date(NOW.getTime() - 1000) });
    const future = buildEnrolmentClass({ id: OTHER_CLASS, startsAt: TOMORROW });
    const cancelled = buildEnrolmentClass({
      id: "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b",
      startsAt: new Date(NOW.getTime() - 1000),
      cancelledAt: NOW,
    });
    const mine = buildEnrolment({ classId: started.id });
    const repository = new FakeEnrolmentRepository(
      [
        mine,
        buildEnrolment({ classId: future.id }),
        buildEnrolment({ classId: cancelled.id }),
        buildEnrolment({ classId: started.id, status: "withdrawn" }),
        buildEnrolment({ classId: "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d" }),
      ],
      [started, future, cancelled],
    );

    expect(await repository.findExpirable(NOW)).toEqual([
      { enrolment: mine, discipline: "surf", startsAt: started.startsAt },
    ]);
  });

  it("closes the open enrolments of a class and leaves the rest", async () => {
    const pending = buildEnrolment();
    const approved = buildEnrolment({ status: "approved", studentId: "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b" });
    const withdrawn = buildEnrolment({ status: "withdrawn" });
    const elsewhere = buildEnrolment({ classId: OTHER_CLASS });
    const repository = new FakeEnrolmentRepository([pending, approved, withdrawn, elsewhere]);

    const closed = await repository.closeOpenForClass(CLASS_ID, NOW);

    expect(closed.map((item) => [item.id, item.status])).toEqual([
      [pending.id, "classCancelled"],
      [approved.id, "classCancelled"],
    ]);
    expect(repository.all.map((item) => item.status)).toEqual([
      "classCancelled",
      "classCancelled",
      "withdrawn",
      "pending",
    ]);
  });
});

describe("FakeEnrolmentRepository decisions", () => {
  const other = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";

  it("approves a pending request while the class has a free seat", async () => {
    const pending = buildEnrolment();
    const repository = new FakeEnrolmentRepository(
      [pending, buildEnrolment({ studentId: other, status: "approved" })],
      [buildEnrolmentClass({ capacity: 2 })],
    );

    expect(await repository.approve(pending.id, NOW)).toBe("approved");
    expect((await repository.findById(pending.id))?.status).toBe("approved");
  });

  it("refuses a full class, a decided request and a missing one", async () => {
    const pending = buildEnrolment();
    const decided = buildEnrolment({ studentId: other, status: "denied" });
    const repository = new FakeEnrolmentRepository(
      [pending, decided, buildEnrolment({ studentId: "1f2e3d4c-5b6a-4978-8a9b-0c1d2e3f4a5b", status: "approved" })],
      [buildEnrolmentClass({ capacity: 1 })],
    );

    expect(await repository.approve(pending.id, NOW)).toBe("full");
    expect(await repository.approve(decided.id, NOW)).toBe("notPending");
    expect(await repository.approve("missing", NOW)).toBe("notPending");
    expect((await repository.findById(pending.id))?.status).toBe("pending");
  });

  it("denies only a pending request", async () => {
    const pending = buildEnrolment();
    const repository = new FakeEnrolmentRepository([pending]);

    expect(await repository.deny(pending.id, "Sem vaga", NOW)).toBe(true);
    expect((await repository.findById(pending.id))?.reason).toBe("Sem vaga");
    expect(await repository.deny(pending.id, null, NOW)).toBe(false);
  });

  it("reads the pending classes it was given, leaving out started and empty ones", async () => {
    const repository = new FakeEnrolmentRepository();
    const upcoming = {
      id: CLASS_ID,
      discipline: "surf" as const,
      level: "beginner" as const,
      startsAt: TOMORROW,
      endsAt: TOMORROW,
      capacity: 8,
      seatsTaken: 0,
      location: { name: "Praia" },
      requests: [{ id: "r1", requestedAt: NOW, student: { id: STUDENT.id, name: "Ana", photoUrl: null } }],
    };
    repository.pendingClasses = [
      upcoming,
      { ...upcoming, id: "started", startsAt: new Date(NOW.getTime() - 1) },
      { ...upcoming, id: "empty", requests: [] },
    ];

    expect(await repository.findPendingByClass(NOW)).toEqual([upcoming]);
  });
});

describe("the other fakes", () => {
  it("reads classes and names", async () => {
    const found = buildEnrolmentClass();
    const reader = new FakeEnrolmentClassReader([found]);
    const names = new FakeStudentNameReader({ [STUDENT.id]: "Ana Souza" });

    expect(await reader.findById(CLASS_ID)).toBe(found);
    expect(await reader.findById("missing")).toBeNull();
    expect(await names.findName(STUDENT.id)).toBe("Ana Souza");
    expect(await names.findName("missing")).toBeNull();
    expect(new FakeClockProvider(NOW).now()).toEqual(NOW);
  });

  it("records notifications and fails when asked to", async () => {
    const notifier = new FakeEnrolmentNotifier();
    const requested = {
      classId: CLASS_ID,
      studentName: "Ana Souza",
      discipline: "surf" as const,
      startsAt: TOMORROW,
      instructorIds: [],
    };
    const expired = { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf" as const, startsAt: TOMORROW };

    await notifier.seatRequested(requested);
    await notifier.requestExpired(expired);
    expect(notifier.requestedEvents).toEqual([requested]);
    expect(notifier.expiredEvents).toEqual([expired]);

    const approved = { studentId: STUDENT.id, classId: CLASS_ID, discipline: "surf" as const, startsAt: TOMORROW };
    await notifier.requestApproved(approved);
    await notifier.requestDenied({ ...approved, reason: "Sem vaga" });
    expect(notifier.approvedEvents).toEqual([approved]);
    expect(notifier.deniedEvents).toEqual([{ ...approved, reason: "Sem vaga" }]);

    notifier.error = new Error("push down");
    await expect(notifier.requestApproved(approved)).rejects.toThrow("push down");
    await expect(notifier.requestDenied(approved)).rejects.toThrow("push down");
    await expect(notifier.seatRequested(requested)).rejects.toThrow("push down");
    await expect(notifier.requestExpired(expired)).rejects.toThrow("push down");
  });
});
