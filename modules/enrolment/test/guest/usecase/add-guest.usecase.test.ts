import { DomainError, ForbiddenError, NotFoundError, ValidationException } from "@rochas-surf-school/shared";
import { AddGuest } from "../../../src";
import {
  ADMIN,
  buildEnrolmentClass,
  buildGuest,
  CLASS_ID,
  FakeClockProvider,
  FakeEnrolmentClassReader,
  FakeGuestRepository,
  INSTRUCTOR,
  NOW,
  STUDENT,
  TOMORROW,
} from "../../mock";

const VALID = { name: "Carolina Reis", whatsappNumber: "+5585999990000" };

function setup(options: { classOverrides?: Parameters<typeof buildEnrolmentClass>[0]; now?: Date } = {}) {
  const found = buildEnrolmentClass(options.classOverrides);
  const guests = new FakeGuestRepository([], [found]);
  const useCase = new AddGuest(
    guests,
    new FakeEnrolmentClassReader([found]),
    new FakeClockProvider(options.now ?? NOW),
  );

  return { useCase, guests, input: { actor: ADMIN, classId: CLASS_ID, ...VALID } };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

describe("AddGuest", () => {
  it("adds the guest with the trimmed name and number, created by the admin", async () => {
    const { useCase, guests, input } = setup();

    const out = await useCase.execute({
      ...input,
      name: "  Carolina Reis ",
      whatsappNumber: " +5585999990000 ",
    });

    expect(out).toEqual({ id: expect.any(String), classId: CLASS_ID, name: "Carolina Reis" });
    const [saved] = guests.all;
    expect(saved.id).toBe(out.id);
    expect(saved.name).toBe("Carolina Reis");
    expect(saved.whatsappNumber).toBe("+5585999990000");
    expect(saved.createdBy).toBe(ADMIN.id);
  });

  it.each([
    [{ ...ADMIN, status: "pending" as const }, new ForbiddenError("user.status.notApproved")],
    [STUDENT, new ForbiddenError("user.role.notAdmin")],
    [INSTRUCTOR, new ForbiddenError("user.role.notAdmin")],
  ])("refuses %j", async (actor, expected) => {
    const { useCase, guests, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, actor }))).toEqual(expected);
    expect(guests.all).toEqual([]);
  });

  it.each([["x"], [undefined], [42]])("answers 404 for the class %j", async (classId) => {
    const { useCase, input } = setup();

    expect(await errorOf(useCase.execute({ ...input, classId: classId as string }))).toEqual(
      new NotFoundError("class.notFound"),
    );
  });

  it("answers 404 for a class that doesn't exist", async () => {
    const { useCase, input } = setup();

    expect(
      await errorOf(useCase.execute({ ...input, classId: "9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f" })),
    ).toEqual(new NotFoundError("class.notFound"));
  });

  it("reports the name and number problems together", async () => {
    const { useCase, guests, input } = setup();

    const error = await errorOf(useCase.execute({ ...input, name: 7, whatsappNumber: undefined }));

    expect(error).toBeInstanceOf(ValidationException);
    expect((error as ValidationException).errors.map((item) => item.message)).toEqual(
      expect.arrayContaining(["guest.name.required", "guest.whatsappNumber.invalid"]),
    );
    expect(guests.all).toEqual([]);
  });

  it("checks the shape before the state of the class", async () => {
    const { useCase, input } = setup({ classOverrides: { cancelledAt: NOW } });

    expect(await errorOf(useCase.execute({ ...input, name: "" }))).toBeInstanceOf(ValidationException);
  });

  it("refuses a cancelled class", async () => {
    const { useCase, guests, input } = setup({ classOverrides: { cancelledAt: NOW } });

    expect(await errorOf(useCase.execute(input))).toEqual(new DomainError("class.cancelled", 409));
    expect(guests.all).toEqual([]);
  });

  it.each([[TOMORROW], [new Date(TOMORROW.getTime() + 1)]])("refuses a class that started at %s", async (now) => {
    const { useCase, input } = setup({ now });

    expect(await errorOf(useCase.execute(input))).toEqual(new DomainError("class.started", 409));
  });

  it("refuses a class with no free seat, and takes the last one", async () => {
    const found = buildEnrolmentClass({ capacity: 2 });
    const guests = new FakeGuestRepository([buildGuest()], [found]);
    const useCase = new AddGuest(guests, new FakeEnrolmentClassReader([found]), new FakeClockProvider(NOW));
    const input = { actor: ADMIN, classId: CLASS_ID, ...VALID };

    expect((await useCase.execute(input)).classId).toBe(CLASS_ID);
    expect(await errorOf(useCase.execute(input))).toEqual(new DomainError("enrolment.class.full", 409));
    expect(guests.all).toHaveLength(2);
  });
});
