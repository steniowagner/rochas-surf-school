import { ConflictError } from "@rochas-surf-school/shared";
import { buildClass, buildLocation, FakeLocationRepository, INSTRUCTOR_ID } from "../../mock";

const NOW = new Date("2026-10-18T12:00:00.000Z");
const TOMORROW = new Date("2026-10-19T12:00:00.000Z");
const YESTERDAY = new Date("2026-10-17T12:00:00.000Z");
const OTHER_INSTRUCTOR = "0c9e5b1a-2d3f-4a60-9b71-8e4d6c2f1a03";

describe("FakeLocationRepository", () => {
  it("lists active locations by name key, then by id, with their upcoming classes", async () => {
    const zeta = buildLocation("Zeta");
    const alpha = buildLocation("Álamo");
    const gone = buildLocation("Beta", "x", { archivedAt: YESTERDAY });
    const repository = new FakeLocationRepository(
      [zeta, alpha, gone],
      [
        buildClass({ locationId: zeta.id, startsAt: TOMORROW }),
        buildClass({ locationId: zeta.id, startsAt: YESTERDAY }),
        buildClass({ locationId: zeta.id, startsAt: TOMORROW, cancelledAt: YESTERDAY }),
      ],
    );

    const out = await repository.findActive(NOW);

    expect(out.map((item) => [item.location.name, item.upcomingClasses])).toEqual([
      ["Álamo", 0],
      ["Zeta", 1],
    ]);
  });

  it("finds by id (archived too) and by active name key", async () => {
    const location = buildLocation("Praia");
    const gone = buildLocation("Beta", "x", { archivedAt: YESTERDAY });
    const repository = new FakeLocationRepository([location, gone]);

    expect(await repository.findById(location.id)).toBe(location);
    expect(await repository.findById(gone.id)).toBe(gone);
    expect(await repository.findById("missing")).toBeNull();
    expect(await repository.existsByNameKey("praia")).toBe(true);
    expect(await repository.existsByNameKey("outra")).toBe(false);
    expect(await repository.existsByNameKey("beta")).toBe(false);
  });

  it("creates a location and rejects a duplicated name key", async () => {
    const repository = new FakeLocationRepository();

    await repository.create(buildLocation("Praia"));

    await expect(repository.create(buildLocation("PRAIA"))).rejects.toThrow(ConflictError);
    expect(await repository.findActive(NOW)).toHaveLength(1);
  });

  it("updates a location, clears the deadlines of its upcoming classes and rejects a duplicated name", async () => {
    const location = buildLocation("Praia");
    const other = buildLocation("Outra");
    const deadline = new Date("2026-10-19T08:00:00.000Z");
    const upcoming = buildClass({ locationId: location.id, startsAt: TOMORROW, cancellationDeadline: deadline });
    const past = buildClass({ locationId: location.id, startsAt: YESTERDAY, cancellationDeadline: deadline });
    const cancelled = buildClass({
      locationId: location.id,
      startsAt: TOMORROW,
      cancelledAt: YESTERDAY,
      cancellationDeadline: deadline,
    });
    const elsewhere = buildClass({ locationId: other.id, startsAt: TOMORROW, cancellationDeadline: deadline });
    const repository = new FakeLocationRepository(
      [location, other],
      [upcoming, past, cancelled, elsewhere],
    );

    await repository.update(location.clone({ address: "Nova" }), { clearDeadlinesFrom: null });
    expect(repository.allClasses.map((item) => item.cancellationDeadline)).toEqual([
      deadline,
      deadline,
      deadline,
      deadline,
    ]);

    await repository.update(location.clone({ name: "Praia 2" }), { clearDeadlinesFrom: NOW });

    const stored = repository.allClasses;
    expect(stored[0].cancellationDeadline).toBeNull();
    expect(stored[0].deadlineRevision).toBe(1);
    expect(stored.slice(1).map((item) => item.cancellationDeadline)).toEqual([
      deadline,
      deadline,
      deadline,
    ]);
    expect((await repository.findById(location.id))?.name).toBe("Praia 2");

    await expect(
      repository.update(location.clone({ name: "OUTRA" }), { clearDeadlinesFrom: null }),
    ).rejects.toThrow(ConflictError);
  });

  it("archives once", async () => {
    const location = buildLocation("Praia");
    const repository = new FakeLocationRepository([location]);

    expect(await repository.archive(location.id)).toBe(true);
    expect(await repository.archive(location.id)).toBe(false);
    expect(await repository.archive("missing")).toBe(false);
    expect((await repository.findById(location.id))?.isArchived).toBe(true);
    expect(await repository.existsByNameKey("praia")).toBe(false);
  });

  it("counts the upcoming classes per instructor", async () => {
    const location = buildLocation("Praia");
    const repository = new FakeLocationRepository(
      [location],
      [
        buildClass({ locationId: location.id, startsAt: TOMORROW }),
        buildClass({ locationId: location.id, startsAt: TOMORROW }),
        buildClass({ locationId: location.id, startsAt: TOMORROW, instructorIds: [INSTRUCTOR_ID, OTHER_INSTRUCTOR] }),
        buildClass({ locationId: location.id, startsAt: YESTERDAY }),
      ],
    );

    expect(await repository.findUpcomingInstructorCounts(location.id, NOW)).toEqual([
      { instructorId: OTHER_INSTRUCTOR, count: 1 },
      { instructorId: INSTRUCTOR_ID, count: 3 },
    ]);
  });
});
