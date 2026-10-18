import { ConflictError, ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { ArchiveLocation, Location, LocationRepository } from "../../../src";
import { ADMIN, buildClass, buildLocation, FakeLocationRepository, INSTRUCTOR, STUDENT } from "../../mock";

describe("ArchiveLocation", () => {
  it("archives the location, frees its name and keeps the classes that use it", async () => {
    const location = buildLocation("Praia");
    const used = buildClass({ locationId: location.id });
    const repository = new FakeLocationRepository([location], [used]);
    const useCase = new ArchiveLocation(repository);

    await expect(useCase.execute({ actor: ADMIN, id: location.id })).resolves.toBeUndefined();

    expect((await repository.findById(location.id))?.isArchived).toBe(true);
    expect(await repository.findActive(new Date())).toEqual([]);
    expect(await repository.existsByNameKey("praia")).toBe(false);
    expect(repository.allClasses[0].locationId).toBe(location.id);
  });

  it("archives the last active location", async () => {
    const location = buildLocation("Unica");
    const repository = new FakeLocationRepository([location]);

    await new ArchiveLocation(repository).execute({ actor: ADMIN, id: location.id });

    expect(await repository.findActive(new Date())).toHaveLength(0);
  });

  it("refuses a location that is already archived", async () => {
    const location = buildLocation("Praia", "x", { archivedAt: new Date("2026-10-01T10:00:00.000Z") });
    const repository = new FakeLocationRepository([location]);

    const error = await new ArchiveLocation(repository)
      .execute({ actor: ADMIN, id: location.id })
      .catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe("location.archived");
    expect(repository.archiveCalls).toHaveLength(0);
  });

  it("answers 409 to the loser of two concurrent archives", async () => {
    const location = buildLocation("Praia");
    const repository = new FakeLocationRepository([location]);
    const racing: LocationRepository = {
      findActive: (now) => repository.findActive(now),
      findById: async (id) => (await repository.findById(id)) as Location,
      existsByNameKey: (key) => repository.existsByNameKey(key),
      create: (item) => repository.create(item),
      update: (item, options) => repository.update(item, options),
      archive: async (id) => {
        await repository.archive(id);
        return repository.archive(id);
      },
      findUpcomingInstructorCounts: (id, now) => repository.findUpcomingInstructorCounts(id, now),
    };

    const error = await new ArchiveLocation(racing).execute({ actor: ADMIN, id: location.id }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe("location.archived");
  });

  it.each(["not-a-uuid", "7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12"])("answers 404 for the id %s", async (id) => {
    const error = await new ArchiveLocation(new FakeLocationRepository())
      .execute({ actor: ADMIN, id })
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe("location.notFound");
  });

  it("refuses accounts that are not approved admins", async () => {
    const location = buildLocation("Praia");
    const repository = new FakeLocationRepository([location]);
    const useCase = new ArchiveLocation(repository);

    const pending = await useCase.execute({ actor: { ...ADMIN, status: "pending" }, id: location.id }).catch((e) => e);
    const student = await useCase.execute({ actor: STUDENT, id: location.id }).catch((e) => e);
    const instructor = await useCase.execute({ actor: INSTRUCTOR, id: location.id }).catch((e) => e);

    expect(pending).toBeInstanceOf(ForbiddenError);
    expect(pending.message).toBe("user.status.notApproved");
    expect(student.message).toBe("user.role.notAdmin");
    expect(instructor.message).toBe("user.role.notAdmin");
    expect(repository.archiveCalls).toHaveLength(0);
  });
});
