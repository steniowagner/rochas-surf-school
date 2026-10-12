import {
  GetSchoolSettings,
  SCHOOL_SETTINGS_ID,
  SchoolSettings,
} from "../../../src";
import {
  ADMIN,
  FakeSchoolSettingsRepository,
  NOT_APPROVED_STATUSES,
  STUDENT,
} from "../../mock";

describe("GetSchoolSettings", () => {
  it("answers no number while none was ever set", async () => {
    const useCase = new GetSchoolSettings(new FakeSchoolSettingsRepository());

    await expect(useCase.execute({ actor: STUDENT })).resolves.toEqual({
      whatsappNumber: null,
    });
  });

  it("answers the stored number once one is set", async () => {
    const repository = new FakeSchoolSettingsRepository(
      new SchoolSettings({
        id: SCHOOL_SETTINGS_ID,
        whatsappNumber: "+5585999998888",
      }),
    );
    const useCase = new GetSchoolSettings(repository);

    await expect(useCase.execute({ actor: ADMIN })).resolves.toEqual({
      whatsappNumber: "+5585999998888",
    });
  });

  it.each(["admin", "instructor", "student"])(
    "lets every status of a %s read the number",
    async (role) => {
      const repository = new FakeSchoolSettingsRepository(
        new SchoolSettings({
          id: SCHOOL_SETTINGS_ID,
          whatsappNumber: "+5585999998888",
        }),
      );
      const useCase = new GetSchoolSettings(repository);

      for (const status of ["approved", ...NOT_APPROVED_STATUSES]) {
        await expect(
          useCase.execute({ actor: { id: ADMIN.id, role, status } }),
        ).resolves.toEqual({ whatsappNumber: "+5585999998888" });
      }
    },
  );
});
