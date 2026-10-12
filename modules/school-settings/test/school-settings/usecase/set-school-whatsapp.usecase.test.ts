import {
  DomainError,
  ForbiddenError,
  ValidationException,
} from "@rochas-surf-school/shared";
import {
  SCHOOL_SETTINGS_ID,
  SchoolSettings,
  SetSchoolWhatsapp,
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

function storedSettings(whatsappNumber = "+5585999998888"): SchoolSettings {
  return new SchoolSettings({ id: SCHOOL_SETTINGS_ID, whatsappNumber });
}

describe("SetSchoolWhatsapp", () => {
  it("sets the number", async () => {
    const repository = new FakeSchoolSettingsRepository();
    const useCase = new SetSchoolWhatsapp(repository);

    const out = await useCase.execute({
      actor: ADMIN,
      whatsappNumber: "+5585999998888",
    });

    expect(out).toEqual({ whatsappNumber: "+5585999998888" });
    const saved = await repository.get();
    expect(saved?.id).toBe(SCHOOL_SETTINGS_ID);
    expect(saved?.whatsappNumber).toBe("+5585999998888");
  });

  it("replaces the number", async () => {
    const existing = storedSettings();
    const repository = new FakeSchoolSettingsRepository(existing);
    const useCase = new SetSchoolWhatsapp(repository);

    const out = await useCase.execute({
      actor: ADMIN,
      whatsappNumber: "+351912345678",
    });

    expect(out).toEqual({ whatsappNumber: "+351912345678" });
    const saved = await repository.get();
    expect(saved?.id).toBe(SCHOOL_SETTINGS_ID);
    expect(saved?.createdAt).toEqual(existing.createdAt);
    expect(saved?.whatsappNumber).toBe("+351912345678");
  });

  it("answers the same number when it is set again", async () => {
    const repository = new FakeSchoolSettingsRepository(storedSettings());
    const useCase = new SetSchoolWhatsapp(repository);

    const out = await useCase.execute({
      actor: ADMIN,
      whatsappNumber: "+5585999998888",
    });

    expect(out).toEqual({ whatsappNumber: "+5585999998888" });
    expect((await repository.get())?.whatsappNumber).toBe("+5585999998888");
  });

  describe("invalid number", () => {
    it.each([
      ["missing", undefined, "schoolSettings.whatsappNumber.required"],
      ["null", null, "schoolSettings.whatsappNumber.required"],
      ["empty", "", "schoolSettings.whatsappNumber.required"],
      [
        "formatted",
        "+55 (85) 99999-8888",
        "schoolSettings.whatsappNumber.phone",
      ],
      [
        "with an extension",
        "+5585999998888 ext. 12",
        "schoolSettings.whatsappNumber.phone",
      ],
      [
        "with a trailing space",
        "+5585999998888 ",
        "schoolSettings.whatsappNumber.phone",
      ],
      ["impossible", "+55123", "schoolSettings.whatsappNumber.phone"],
      ["a number type", 5585999998888, "schoolSettings.whatsappNumber.phone"],
      [
        "a list of numbers",
        ["+5585999998888"],
        "schoolSettings.whatsappNumber.phone",
      ],
      [
        "an object",
        { number: "+5585999998888" },
        "schoolSettings.whatsappNumber.phone",
      ],
    ])(
      "refuses a %s number and keeps the stored one",
      async (_label, whatsappNumber, key) => {
        const repository = new FakeSchoolSettingsRepository(storedSettings());
        const useCase = new SetSchoolWhatsapp(repository);

        const error = await errorOf(
          useCase.execute({ actor: ADMIN, whatsappNumber }),
        );

        expect(error).toBeInstanceOf(ValidationException);
        expect(
          (error as ValidationException).errors.map((item) => item.message),
        ).toEqual([key]);
        expect(repository.saved).toEqual([]);
        expect((await repository.get())?.whatsappNumber).toBe("+5585999998888");
      },
    );

    it("stores nothing when no number was set before", async () => {
      const repository = new FakeSchoolSettingsRepository();
      const useCase = new SetSchoolWhatsapp(repository);

      await errorOf(
        useCase.execute({ actor: ADMIN, whatsappNumber: "+55123" }),
      );

      await expect(repository.get()).resolves.toBeNull();
    });
  });

  describe("not approved", () => {
    it.each(
      NOT_APPROVED_STATUSES.flatMap((status) =>
        ["admin", "instructor", "student"].map((role) => [status, role]),
      ),
    )("refuses a %s %s", async (status, role) => {
      const repository = new FakeSchoolSettingsRepository();
      const useCase = new SetSchoolWhatsapp(repository);

      const error = await errorOf(
        useCase.execute({
          actor: { id: ADMIN.id, role, status },
          whatsappNumber: "+5585999998888",
        }),
      );

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
      expect(repository.saved).toEqual([]);
    });

    it("checks the status before the number", async () => {
      const repository = new FakeSchoolSettingsRepository();
      const useCase = new SetSchoolWhatsapp(repository);

      const error = await errorOf(
        useCase.execute({
          actor: { ...STUDENT, status: "pending" },
          whatsappNumber: "+55123",
        }),
      );

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
    });
  });

  describe("not admin", () => {
    it.each([
      ["student", STUDENT],
      ["instructor", INSTRUCTOR],
    ])("refuses an approved %s", async (_label, actor) => {
      const repository = new FakeSchoolSettingsRepository(storedSettings());
      const useCase = new SetSchoolWhatsapp(repository);

      const error = await errorOf(
        useCase.execute({ actor, whatsappNumber: "+351912345678" }),
      );

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("schoolSettings.role.notAdmin");
      expect(repository.saved).toEqual([]);
    });

    it("checks the role before the number", async () => {
      const useCase = new SetSchoolWhatsapp(new FakeSchoolSettingsRepository());

      const error = await errorOf(
        useCase.execute({ actor: STUDENT, whatsappNumber: "+55123" }),
      );

      expect(error.message).toBe("schoolSettings.role.notAdmin");
    });
  });
});
