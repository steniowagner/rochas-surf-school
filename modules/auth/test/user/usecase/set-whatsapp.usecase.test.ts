import {
  ForbiddenError,
  UnauthorizedError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { SetWhatsapp, User, UserStatus } from "../../../src";
import { FakeUserRepository } from "../../mock";

const CREATED_AT = new Date("2026-09-01T10:30:00.000Z");

function buildUser(
  status: UserStatus = "approved",
  overrides: { whatsappNumber?: string; whatsappVisible?: boolean } = {},
): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status,
    createdAt: CREATED_AT,
    ...overrides,
  });
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("SetWhatsapp", () => {
  test("saves the number and the visibility of an approved account", async () => {
    const ana = buildUser();
    const repository = new FakeUserRepository([ana]);
    const useCase = new SetWhatsapp(repository);

    await expect(
      useCase.execute({
        userId: ana.id,
        whatsappNumber: "+5585999998888",
        whatsappVisible: true,
      }),
    ).resolves.toEqual({
      id: ana.id,
      name: "Ana Rocha",
      email: "ana@example.com",
      role: "student",
      status: "approved",
      createdAt: CREATED_AT,
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
    });

    const saved = await repository.findById(ana.id);
    expect(saved?.whatsappNumber).toBe("+5585999998888");
    expect(saved?.whatsappVisible).toBe(true);
  });

  test("replaces both values of an account that already has a number", async () => {
    const ana = buildUser("approved", {
      whatsappNumber: "+5585999998888",
      whatsappVisible: false,
    });
    const repository = new FakeUserRepository([ana]);
    const useCase = new SetWhatsapp(repository);

    const out = await useCase.execute({
      userId: ana.id,
      whatsappNumber: "+351912345678",
      whatsappVisible: true,
    });

    expect(out).toMatchObject({ whatsappNumber: "+351912345678", whatsappVisible: true });
  });

  test("lets another account save the same number", async () => {
    const ana = buildUser("approved", { whatsappNumber: "+5585999998888" });
    const bia = new User({
      name: "Bia Rocha",
      email: "bia@example.com",
      whatsappVisible: false,
      role: "student",
      status: "approved",
    });
    const useCase = new SetWhatsapp(new FakeUserRepository([ana, bia]));

    await expect(
      useCase.execute({
        userId: bia.id,
        whatsappNumber: "+5585999998888",
        whatsappVisible: false,
      }),
    ).resolves.toMatchObject({ whatsappNumber: "+5585999998888" });
  });

  test.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account with user.status.notApproved",
    async (status) => {
      const ana = buildUser(status);
      const repository = new FakeUserRepository([ana]);
      const useCase = new SetWhatsapp(repository);

      const error = await useCase
        .execute({
          userId: ana.id,
          whatsappNumber: "+5585999998888",
          whatsappVisible: false,
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error).toMatchObject({ message: "user.status.notApproved", statusCode: 403 });
      expect((await repository.findById(ana.id))?.whatsappNumber).toBeUndefined();
    },
  );

  test("refuses an account that no longer exists with auth.token.invalid", async () => {
    const useCase = new SetWhatsapp(new FakeUserRepository());

    const error = await useCase
      .execute({
        userId: buildUser().id,
        whatsappNumber: "+5585999998888",
        whatsappVisible: false,
      })
      .catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ message: "auth.token.invalid", statusCode: 401 });
  });

  test.each([undefined, null, "", "   "])(
    "requires a number (%p) and keeps the stored one",
    async (whatsappNumber) => {
      const ana = buildUser("approved", { whatsappNumber: "+5585999998888" });
      const repository = new FakeUserRepository([ana]);
      const useCase = new SetWhatsapp(repository);

      const messages = await errorsOf(
        useCase.execute({
          userId: ana.id,
          whatsappNumber: whatsappNumber as never,
          whatsappVisible: true,
        }),
      );

      expect(messages).toEqual(["user.whatsappNumber.required"]);
      const saved = await repository.findById(ana.id);
      expect(saved?.whatsappNumber).toBe("+5585999998888");
      expect(saved?.whatsappVisible).toBe(false);
    },
  );

  test("refuses an invalid number and saves nothing", async () => {
    const ana = buildUser();
    const repository = new FakeUserRepository([ana]);
    const useCase = new SetWhatsapp(repository);

    const messages = await errorsOf(
      useCase.execute({ userId: ana.id, whatsappNumber: "+55123", whatsappVisible: true }),
    );

    expect(messages).toEqual(["user.whatsappNumber.phone"]);
    expect((await repository.findById(ana.id))?.whatsappNumber).toBeUndefined();
  });

  test("requires the visibility", async () => {
    const ana = buildUser();
    const useCase = new SetWhatsapp(new FakeUserRepository([ana]));

    const messages = await errorsOf(
      useCase.execute({
        userId: ana.id,
        whatsappNumber: "+5585999998888",
        whatsappVisible: undefined as never,
      }),
    );

    expect(messages).toEqual(["user.whatsappVisible.required"]);
  });

  test("refuses a visibility that is not a boolean", async () => {
    const ana = buildUser();
    const useCase = new SetWhatsapp(new FakeUserRepository([ana]));

    const messages = await errorsOf(
      useCase.execute({
        userId: ana.id,
        whatsappNumber: "+5585999998888",
        whatsappVisible: "yes" as never,
      }),
    );

    expect(messages).toEqual(["user.whatsappVisible.in"]);
  });
});
