import { User, UserRole, UserStatus } from "@rochas-surf-school/auth";
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { AcceptSchoolRules, SchoolRuleActor } from "../../../src";
import { FakeClockProvider, FakeSchoolRuleRepository, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-10-11T12:00:00.000Z");
const EARLIER = new Date("2026-10-01T09:00:00.000Z");

function buildUser(
  overrides: { role?: UserRole; status?: UserStatus; whatsappNumber?: string } = {},
  versions: { version: number; acceptedAt: Date }[] = [],
): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: overrides.role ?? "student",
    status: overrides.status ?? "approved",
    whatsappNumber: overrides.whatsappNumber,
    rulesAcceptances: versions,
  });
}

function actorOf(user: User): SchoolRuleActor {
  return { id: user.id, role: user.role, status: user.status };
}

function setup(user: User, version = 3) {
  const userRepository = new FakeUserRepository([user]);
  const addSpy = jest.spyOn(userRepository, "addRulesAcceptance");
  const useCase = new AcceptSchoolRules(
    new FakeSchoolRuleRepository([], version),
    userRepository,
    new FakeClockProvider(NOW),
  );
  return { userRepository, addSpy, useCase };
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  expect(error.statusCode).toBe(422);
  return error.errors.map((item) => item.message);
}

describe("AcceptSchoolRules", () => {
  it.each<UserRole>(["student", "instructor", "admin"])(
    "lets an approved %s accept the current version without a WhatsApp number",
    async (role) => {
      const ana = buildUser({ role });
      const { userRepository, useCase } = setup(ana);

      const out = await useCase.execute({ actor: actorOf(ana), version: 3 });

      expect(out).toMatchObject({
        id: ana.id,
        role,
        rulesAccepted: true,
        rulesAcceptedBefore: true,
        whatsappNumber: null,
      });
      const saved = await userRepository.findById(ana.id);
      expect(saved?.rulesAcceptances).toEqual([{ version: 3, acceptedAt: NOW }]);
    },
  );

  it("keeps the earlier acceptances", async () => {
    const ana = buildUser({}, [{ version: 2, acceptedAt: EARLIER }]);
    const { userRepository, useCase } = setup(ana);

    await useCase.execute({ actor: actorOf(ana), version: 3 });

    const saved = await userRepository.findById(ana.id);
    expect(saved?.rulesAcceptances).toEqual([
      { version: 2, acceptedAt: EARLIER },
      { version: 3, acceptedAt: NOW },
    ]);
  });

  it("answers the account with its WhatsApp number", async () => {
    const ana = buildUser({ whatsappNumber: "+5585999998888" });
    const { useCase } = setup(ana);

    await expect(useCase.execute({ actor: actorOf(ana), version: 3 })).resolves.toMatchObject({
      whatsappNumber: "+5585999998888",
    });
  });

  it("changes nothing when the version was already accepted", async () => {
    const ana = buildUser({}, [{ version: 3, acceptedAt: EARLIER }]);
    const { userRepository, addSpy, useCase } = setup(ana);

    const out = await useCase.execute({ actor: actorOf(ana), version: 3 });

    expect(out.rulesAccepted).toBe(true);
    expect(addSpy).not.toHaveBeenCalled();
    const saved = await userRepository.findById(ana.id);
    expect(saved?.rulesAcceptances).toEqual([{ version: 3, acceptedAt: EARLIER }]);
  });

  it.each([2, 5, -1, 0])(
    "refuses version %s as outdated and stores nothing",
    async (version) => {
      const ana = buildUser();
      const { addSpy, useCase } = setup(ana, 4);

      const error = await useCase.execute({ actor: actorOf(ana), version }).catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error).toMatchObject({
        message: "schoolRules.version.outdated",
        statusCode: 409,
        details: { currentVersion: 4 },
      });
      expect(addSpy).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null])("requires the version (%p)", async (version) => {
    const ana = buildUser();
    const { addSpy, useCase } = setup(ana);

    await expect(errorsOf(useCase.execute({ actor: actorOf(ana), version }))).resolves.toEqual([
      "schoolRules.version.required",
    ]);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it.each(["3", 2.5, [3], true])("refuses %p as not an integer", async (version) => {
    const ana = buildUser();
    const { addSpy, useCase } = setup(ana);

    await expect(errorsOf(useCase.execute({ actor: actorOf(ana), version }))).resolves.toEqual([
      "schoolRules.version.integer",
    ]);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it.each([0, 1, 3])("has nothing to accept while the version is 0 (sent %s)", async (version) => {
    const ana = buildUser();
    const { addSpy, useCase } = setup(ana, 0);

    await expect(errorsOf(useCase.execute({ actor: actorOf(ana), version }))).resolves.toEqual([
      "schoolRules.version.nothingToAccept",
    ]);
    expect(addSpy).not.toHaveBeenCalled();
  });

  it("checks the shape of the version before the version 0 rule", async () => {
    const ana = buildUser();
    const { useCase } = setup(ana, 0);

    await expect(
      errorsOf(useCase.execute({ actor: actorOf(ana), version: undefined })),
    ).resolves.toEqual(["schoolRules.version.required"]);
  });

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account with user.status.notApproved, even with an invalid version",
    async (status) => {
      const ana = buildUser({ status });
      const { addSpy, useCase } = setup(ana);

      for (const version of [3, "x", undefined]) {
        const error = await useCase.execute({ actor: actorOf(ana), version }).catch((e) => e);

        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error).toMatchObject({ message: "user.status.notApproved", statusCode: 403 });
      }
      expect(addSpy).not.toHaveBeenCalled();
    },
  );

  it("refuses an account that no longer exists with auth.token.invalid", async () => {
    const ana = buildUser();
    const { useCase } = setup(buildUser());

    const error = await useCase.execute({ actor: actorOf(ana), version: 3 }).catch((e) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ message: "auth.token.invalid", statusCode: 401 });
  });

  it("falls back to the loaded account when it can't be read again", async () => {
    const ana = buildUser();
    const { userRepository, useCase } = setup(ana);
    const findById = jest.spyOn(userRepository, "findById");
    findById.mockResolvedValueOnce(ana).mockResolvedValueOnce(null);

    const out = await useCase.execute({ actor: actorOf(ana), version: 3 });

    expect(out.id).toBe(ana.id);
  });
});
