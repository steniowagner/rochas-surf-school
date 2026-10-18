import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListLocations } from "../../../src";
import {
  ADMIN,
  buildClass,
  buildLocation,
  FakeClockProvider,
  FakeLocationRepository,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-18T12:00:00.000Z");
const clock = new FakeClockProvider(NOW);

describe("ListLocations", () => {
  it("lists the active locations with their point and upcoming classes, in the repository order", async () => {
    const zeta = buildLocation("Zeta", "Rua Z", { latitude: 1, longitude: 2 });
    const alfa = buildLocation("Alfa", "Rua A", { latitude: null, longitude: null });
    const gone = buildLocation("Beta", "Rua B", { archivedAt: new Date("2026-10-01T10:00:00.000Z") });
    const repository = new FakeLocationRepository(
      [zeta, alfa, gone],
      [buildClass({ locationId: zeta.id, startsAt: new Date("2026-10-19T12:00:00.000Z") })],
    );
    const useCase = new ListLocations(repository, clock);

    const out = await useCase.execute({ actor: STUDENT });

    expect(out.items).toEqual([
      { id: alfa.id, name: "Alfa", address: "Rua A", latitude: null, longitude: null, upcomingClasses: 0 },
      { id: zeta.id, name: "Zeta", address: "Rua Z", latitude: 1, longitude: 2, upcomingClasses: 1 },
    ]);
  });

  it("answers an empty list when there are no locations", async () => {
    const useCase = new ListLocations(new FakeLocationRepository(), clock);

    expect(await useCase.execute({ actor: ADMIN })).toEqual({ items: [] });
  });

  it.each(["pending", "denied", "deleted", "removed"] as const)(
    "refuses an account that is %s",
    async (status) => {
      const useCase = new ListLocations(new FakeLocationRepository(), clock);

      const error = await useCase.execute({ actor: { ...STUDENT, status } }).catch((e) => e);

      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe("user.status.notApproved");
    },
  );
});
