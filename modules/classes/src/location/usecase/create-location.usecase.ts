import { ConflictError, UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { Location } from "../model";
import { LocationRepository } from "../provider";
import { LocationOut, toLocationOut } from "./location.out";

export interface CreateLocationIn {
  actor: ClassActor;
  name: unknown;
  address: unknown;
  latitude: unknown;
  longitude: unknown;
}

/** Absent stays absent; anything that isn't a number becomes NaN, which the point rule calls invalid. */
export function toCoordinate(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  return typeof value === "number" ? value : Number.NaN;
}

export class CreateLocation implements UseCase<CreateLocationIn, LocationOut> {
  constructor(private readonly locationRepository: LocationRepository) {}

  async execute(input: CreateLocationIn): Promise<LocationOut> {
    assertCanManageClasses(input.actor);

    const location = new Location({
      name: typeof input.name === "string" ? input.name : "",
      address: typeof input.address === "string" ? input.address : "",
      latitude: toCoordinate(input.latitude),
      longitude: toCoordinate(input.longitude),
    });
    location.validate();

    if (await this.locationRepository.existsByNameKey(location.nameKey)) {
      throw new ConflictError("location.name.duplicate");
    }

    return toLocationOut(await this.locationRepository.create(location));
  }
}
