import {
  DomainError,
  ForbiddenError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  SCHOOL_SETTINGS_ID,
  SchoolSettings,
  SetWaitingList,
} from "../../../src";
import {
  ADMIN,
  FakeSchoolSettingsRepository,
  INSTRUCTOR,
  NOT_APPROVED_STATUSES,
  STUDENT,
} from "../../mock";

async function errorOf(promise: Promise<unknown>): Promise<DomainError> {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(DomainError);
  return error as DomainError;
}

function storedSettings(
  state: { whatsappNumber?: string; waitingListEnabled?: boolean } = {
    whatsappNumber: "+5585999998888",
  },
): SchoolSettings {
  return new SchoolSettings({ id: SCHOOL_SETTINGS_ID, ...state });
}

describe("SetWaitingList", () => {
  it("turns the waiting list off on a fresh database, with no number", async () => {
    const repository = new FakeSchoolSettingsRepository();
    const useCase = new SetWaitingList(repository);

    const out = await useCase.execute({ actor: ADMIN, enabled: false });

    expect(out).toEqual({ whatsappNumber: null, waitingListEnabled: false });
    const saved = await repository.get();
    expect(saved?.id).toBe(SCHOOL_SETTINGS_ID);
    expect(saved?.waitingListEnabled).toBe(false);
  });

  it("turns it off and keeps the number", async () => {
    const existing = storedSettings();
    const repository = new FakeSchoolSettingsRepository(existing);
    const useCase = new SetWaitingList(repository);

    const out = await useCase.execute({ actor: ADMIN, enabled: false });

    expect(out).toEqual({
      whatsappNumber: "+5585999998888",
      waitingListEnabled: false,
    });
    expect((await repository.get())?.createdAt).toEqual(existing.createdAt);
  });

  it("turns it back on", async () => {
    const repository = new FakeSchoolSettingsRepository(
      storedSettings({
        whatsappNumber: "+5585999998888",
        waitingListEnabled: false,
      }),
    );
    const useCase = new SetWaitingList(repository);

    const out = await useCase.execute({ actor: ADMIN, enabled: true });

    expect(out.waitingListEnabled).toBe(true);
    expect((await repository.get())?.waitingListEnabled).toBe(true);
  });

  it("is kept when the number is saved afterwards", async () => {
    const repository = new FakeSchoolSettingsRepository();
    await new SetWaitingList(repository).execute({
      actor: ADMIN,
      enabled: false,
    });

    const saved = (await repository.get())!.clone({
      whatsappNumber: "+351912345678",
    });

    expect(saved.waitingListEnabled).toBe(false);
    expect(() => saved.validate()).not.toThrow();
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["a string", "false"],
    ["a number", 0],
    ["an object", { enabled: false }],
  ])("refuses %s as the switch", async (_label, enabled) => {
    const repository = new FakeSchoolSettingsRepository(storedSettings());
    const useCase = new SetWaitingList(repository);

    const error = await errorOf(useCase.execute({ actor: ADMIN, enabled }));

    expect(error).toBeInstanceOf(ValidationException);
    expect(
      (error as ValidationException).errors.map((item) => item.message),
    ).toEqual(["schoolSettings.waitingList.invalid"]);
    expect(repository.saved).toEqual([]);
  });

  describe("not approved", () => {
    it.each(
      NOT_APPROVED_STATUSES.flatMap((status) =>
        ["admin", "instructor", "student"].map((role) => [status, role]),
      ),
    )("refuses a %s %s", async (status, role) => {
      const repository = new FakeSchoolSettingsRepository();
      const useCase = new SetWaitingList(repository);

      const error = await errorOf(
        useCase.execute({
          actor: { id: ADMIN.id, role, status },
          enabled: false,
        }),
      );

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
      expect(repository.saved).toEqual([]);
    });
  });

  describe("not admin", () => {
    it.each([
      ["student", STUDENT],
      ["instructor", INSTRUCTOR],
    ])("refuses an approved %s", async (_label, actor) => {
      const repository = new FakeSchoolSettingsRepository(storedSettings());
      const useCase = new SetWaitingList(repository);

      const error = await errorOf(useCase.execute({ actor, enabled: false }));

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("schoolSettings.role.notAdmin");
      expect(repository.saved).toEqual([]);
    });

    it("checks the role before the switch", async () => {
      const useCase = new SetWaitingList(new FakeSchoolSettingsRepository());

      const error = await errorOf(
        useCase.execute({ actor: STUDENT, enabled: "nope" }),
      );

      expect(error.message).toBe("schoolSettings.role.notAdmin");
    });
  });
});
