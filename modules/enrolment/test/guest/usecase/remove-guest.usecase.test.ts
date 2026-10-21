import { DomainError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { RemoveGuest } from "../../../src";
import {
  ADMIN,
  buildEnrolmentClass,
  buildGuest,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeGuestRepository,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

function setup(now: Date = NOW) {
  const found = buildEnrolmentClass();
  const stored = buildGuest();
  const guests = new FakeGuestRepository([stored], [found]);
  const useCase = new RemoveGuest(guests, new FakeEnrolmentClassReader([found]), new FakeClockProvider(now));

  return { useCase, guests, stored, input: { actor: ADMIN, id: stored.id } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("RemoveGuest", () => {
  it("removes the guest and frees the seat", async () => {
    const { useCase, guests, input } = setup();

    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(guests.all).toEqual([]);
  });

  it.each([
    [{ ...ADMIN, status: "pending" as const }, new ForbiddenError("user.status.notApproved")],
    [STUDENT, new ForbiddenError("user.role.notAdmin")],
    [INSTRUCTOR, new ForbiddenError("user.role.notAdmin")],
  ])("refuses %j", async (actor, expected) => {
    const { useCase, guests, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(expected);
    expect(guests.all).toHaveLength(1);
  });

  it.each([["x"], [undefined], ["9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f"]])("answers 404 for %j", async (id) => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, id: id as string }))).toEqual(
      new NotFoundError("guest.notFound"),
    );
  });

  it("answers 404 when the guest's class is gone", async () => {
    const stored = buildGuest();
    const useCase = new RemoveGuest(
      new FakeGuestRepository([stored]),
      new FakeEnrolmentClassReader(),
      new FakeClockProvider(NOW),
    );

    expect(await errorOf(useCase.execute({ actor: ADMIN, id: stored.id }))).toEqual(
      new NotFoundError("guest.notFound"),
    );
  });

  it("refuses a class that started", async () => {
    const { useCase, guests, input } = setup(TOMORROW);

    expect(await errorOf(useCase.execute(input))).toEqual(new DomainError("class.started", 409));
    expect(guests.all).toHaveLength(1);
  });

  it("answers 404 when the guest was removed meanwhile", async () => {
    const { useCase, guests, input, stored } = setup();
    jest.spyOn(guests, "delete").mockResolvedValue(false);

    expect(await errorOf(useCase.execute(input))).toEqual(new NotFoundError("guest.notFound"));
    expect(guests.all).toEqual([stored]);
  });
});
