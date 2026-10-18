import { ConflictError } from "@rochas-surf-school/shared";
import {
  ActiveLocation,
  Location,
  LocationRepository,
  LocationUpdateOptions,
  SchoolClass,
  UpcomingInstructorCount,
} from "../../src";

export class FakeLocationRepository implements LocationRepository {
  readonly updateCalls: { location: Location; options: LocationUpdateOptions }[] = [];
  readonly archiveCalls: string[] = [];
  private locations: Location[];
  private classes: SchoolClass[];

  constructor(locations: Location[] = [], classes: SchoolClass[] = []) {
    this.locations = [...locations];
    this.classes = [...classes];
  }

  get allClasses(): SchoolClass[] {
    return [...this.classes];
  }

  async findActive(now: Date): Promise<ActiveLocation[]> {
    return this.locations
      .filter((item) => !item.isArchived)
      .sort((a, b) => a.nameKey.localeCompare(b.nameKey) || a.id.localeCompare(b.id))
      .map((location) => ({
        location,
        upcomingClasses: this.upcomingAt(location.id, now).length,
      }));
  }

  async findById(id: string): Promise<Location | null> {
    return this.locations.find((item) => item.id === id) ?? null;
  }

  async existsByNameKey(nameKey: string): Promise<boolean> {
    return this.locations.some((item) => !item.isArchived && item.nameKey === nameKey);
  }

  async create(location: Location): Promise<Location> {
    if (await this.existsByNameKey(location.nameKey)) {
      throw new ConflictError("location.name.duplicate");
    }

    this.locations.push(location);
    return location;
  }

  async update(location: Location, options: LocationUpdateOptions): Promise<Location> {
    this.updateCalls.push({ location, options });

    const clash = this.locations.some(
      (item) => !item.isArchived && item.id !== location.id && item.nameKey === location.nameKey,
    );
    if (clash) throw new ConflictError("location.name.duplicate");

    this.locations = this.locations.map((item) => (item.id === location.id ? location : item));

    const from = options.clearDeadlinesFrom;
    if (from) {
      this.classes = this.classes.map((item) =>
        item.locationId === location.id && !item.cancelledAt && item.startsAt.getTime() > from.getTime()
          ? item.clone({
              cancellationDeadline: null,
              deadlineAttempts: 0,
              deadlineNextAttemptAt: null,
              deadlineRevision: (item.deadlineRevision ?? 0) + 1,
              updatedAt: item.updatedAt,
            })
          : item,
      );
    }

    return location;
  }

  async archive(id: string): Promise<boolean> {
    this.archiveCalls.push(id);

    const stored = this.locations.find((item) => item.id === id);
    if (!stored || stored.isArchived) return false;

    this.locations = this.locations.map((item) =>
      item.id === id ? item.clone({ archivedAt: new Date() }) : item,
    );
    return true;
  }

  async findUpcomingInstructorCounts(
    locationId: string,
    now: Date,
  ): Promise<UpcomingInstructorCount[]> {
    const counts = new Map<string, number>();

    for (const item of this.upcomingAt(locationId, now)) {
      for (const instructorId of item.instructorIds) {
        counts.set(instructorId, (counts.get(instructorId) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([instructorId, count]) => ({ instructorId, count }))
      .sort((a, b) => a.instructorId.localeCompare(b.instructorId));
  }

  private upcomingAt(locationId: string, now: Date): SchoolClass[] {
    return this.classes.filter(
      (item) =>
        item.locationId === locationId &&
        !item.cancelledAt &&
        item.startsAt.getTime() > now.getTime(),
    );
  }
}
