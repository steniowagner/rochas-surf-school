import { ConflictError, UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { Location } from "../model";
import { LocationRepository } from "../provider";
import { LocationOut, toLocationOut } from "./location.out";

export interface CreateLocationIn {
  actor: ClassActor;
  name: unknown;
  address: unknown;
}

export class CreateLocation implements UseCase<CreateLocationIn, LocationOut> {
  constructor(private readonly locationRepository: LocationRepository) {}

  async execute(input: CreateLocationIn): Promise<LocationOut> {
    assertCanManageClasses(input.actor);

    const location = new Location({
      name: typeof input.name === "string" ? input.name : "",
      address: typeof input.address === "string" ? input.address : "",
    });
    location.validate();

    if (await this.locationRepository.existsByNameKey(location.nameKey)) {
      throw new ConflictError("location.name.duplicate");
    }

    return toLocationOut(await this.locationRepository.create(location));
  }
}
