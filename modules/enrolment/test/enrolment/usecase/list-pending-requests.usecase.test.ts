import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListPendingRequests, PendingRequestsClass } from "../../../src";
import {
  ADMIN,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentRepository,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

function pendingClass(overrides: Partial<PendingRequestsClass> = {}): PendingRequestsClass {
  return {
    id: CLASS_ID,
    discipline: "surf",
    level: "beginner",
    startsAt: TOMORROW,
    endsAt: new Date(TOMORROW.getTime() + 60 * 60 * 1000),
    capacity: 8,
    seatsTaken: 3,
    location: { name: "Praia do Futuro" },
    requests: [
      {
        id: "a1111111-1111-4111-8111-111111111111",
        requestedAt: NOW,
        student: { id: STUDENT.id, name: "Ana Souza", photoUrl: null },
      },
    ],
    ...overrides,
  };
}

function setup(classes: PendingRequestsClass[]) {
  const repository = new FakeEnrolmentRepository();
  repository.pendingClasses = classes;

  return new ListPendingRequests(repository, new FakeClockProvider(NOW));
}

describe("ListPendingRequests", () => {
  it("lists the classes with their requests and counts the requests", async () => {
    const first = pendingClass();
    const second = pendingClass({
      id: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f",
      requests: [...first.requests, { ...first.requests[0], id: "b2222222-2222-4222-8222-222222222222" }],
    });

    const out = await setup([first, second]).execute({ actor: ADMIN });

    expect(out).toEqual({ total: 3, classes: [first, second] });
  });

  it("leaves out classes that started or have no pending request", async () => {
    const started = pendingClass({ startsAt: new Date(NOW.getTime() - 1000) });
    const empty = pendingClass({ requests: [] });

    expect(await setup([started, empty]).execute({ actor: ADMIN })).toEqual({ total: 0, classes: [] });
  });

  it.each([[STUDENT], [INSTRUCTOR]])("refuses %j", async (actor) => {
    await expect(setup([pendingClass()]).execute({ actor })).rejects.toEqual(
      new ForbiddenError("user.role.notAdmin"),
    );
  });

  it("refuses an admin that isn't approved", async () => {
    await expect(setup([]).execute({ actor: { ...ADMIN, status: "removed" } })).rejects.toEqual(
      new ForbiddenError("user.status.notApproved"),
    );
  });
});
