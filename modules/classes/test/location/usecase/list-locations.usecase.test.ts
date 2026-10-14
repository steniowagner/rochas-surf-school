import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListLocations } from "../../../src";
import { ADMIN, buildLocation, FakeLocationRepository, STUDENT } from "../../mock";

describe("ListLocations", () => {
  it("lists every location with id, name and address, in the repository order", async () => {
    const repository = new FakeLocationRepository([
      buildLocation("Zeta", "Rua Z"),
      buildLocation("Alfa", "Rua A"),
    ]);
    const useCase = new ListLocations(repository);

    const out = await useCase.execute({ actor: STUDENT });

    expect(out.items.map((item) => [item.name, item.address])).toEqual([
      ["Alfa", "Rua A"],
      ["Zeta", "Rua Z"],
    ]);
    expect(out.items[0].id).toEqual(expect.any(String));
  });

  it("answers an empty list when there are no locations", async () => {
    const useCase = new ListLocations(new FakeLocationRepository());

    expect(await useCase.execute({ actor: ADMIN })).toEqual({ items: [] });
  });

  it.each(["pending", "denied", "deleted", "removed"] as const)(
    "refuses an account that is %s",
    async (status) => {
      const useCase = new ListLocations(new FakeLocationRepository());

      const error = await useCase
        .execute({ actor: { ...STUDENT, status } })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
    },
  );
});
