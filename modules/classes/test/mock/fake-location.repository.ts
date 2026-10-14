import { ConflictError } from "@rochas-surf-school/shared";
import { Location, LocationRepository } from "../../src";

export class FakeLocationRepository implements LocationRepository {
  private locations: Location[];

  constructor(locations: Location[] = []) {
    this.locations = [...locations];
  }

  async findAll(): Promise<Location[]> {
    return [...this.locations].sort(
      (a, b) =>
        a.nameKey.localeCompare(b.nameKey) || a.id.localeCompare(b.id),
    );
  }

  async findById(id: string): Promise<Location | null> {
    return this.locations.find((item) => item.id === id) ?? null;
  }

  async existsByNameKey(nameKey: string): Promise<boolean> {
    return this.locations.some((item) => item.nameKey === nameKey);
  }

  async create(location: Location): Promise<Location> {
    if (await this.existsByNameKey(location.nameKey)) {
      throw new ConflictError("location.name.duplicate");
    }

    this.locations.push(location);
    return location;
  }
}
