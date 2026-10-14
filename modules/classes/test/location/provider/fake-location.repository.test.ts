import { ConflictError } from "@rochas-surf-school/shared";
import { buildLocation, FakeLocationRepository } from "../../mock";

describe("FakeLocationRepository", () => {
  it("lists locations by name key, then by id", async () => {
    const zeta = buildLocation("Zeta");
    const alpha = buildLocation("Álamo");
    const repository = new FakeLocationRepository([zeta, alpha]);

    expect((await repository.findAll()).map((item) => item.name)).toEqual([
      "Álamo",
      "Zeta",
    ]);
  });

  it("finds by id and by name key", async () => {
    const location = buildLocation("Praia");
    const repository = new FakeLocationRepository([location]);

    expect(await repository.findById(location.id)).toBe(location);
    expect(await repository.findById("missing")).toBeNull();
    expect(await repository.existsByNameKey("praia")).toBe(true);
    expect(await repository.existsByNameKey("outra")).toBe(false);
  });

  it("creates a location and rejects a duplicated name key", async () => {
    const repository = new FakeLocationRepository();

    await repository.create(buildLocation("Praia"));

    await expect(repository.create(buildLocation("PRAIA"))).rejects.toThrow(
      ConflictError,
    );
    expect(await repository.findAll()).toHaveLength(1);
  });
});
