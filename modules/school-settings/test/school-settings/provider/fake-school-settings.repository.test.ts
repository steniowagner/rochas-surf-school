import { SchoolSettings } from "../../../src";
import { FakeSchoolSettingsRepository } from "../../mock";

describe("FakeSchoolSettingsRepository", () => {
  it("starts with no settings", async () => {
    const repository = new FakeSchoolSettingsRepository();

    await expect(repository.get()).resolves.toBeNull();
    expect(repository.saved).toEqual([]);
  });

  it("starts with the given settings", async () => {
    const settings = new SchoolSettings({ whatsappNumber: "+5585999998888" });
    const repository = new FakeSchoolSettingsRepository(settings);

    await expect(repository.get()).resolves.toBe(settings);
  });

  it("replaces the settings on every save and records each one", async () => {
    const first = new SchoolSettings({ whatsappNumber: "+5585999998888" });
    const second = first.clone({ whatsappNumber: "+351912345678" });
    const repository = new FakeSchoolSettingsRepository();

    await repository.save(first);
    await repository.save(second);

    await expect(repository.get()).resolves.toBe(second);
    expect(repository.saved).toEqual([first, second]);
  });
});
