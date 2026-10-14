import { UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import { LocationRepository } from "../provider";
import { LocationOut, toLocationOut } from "./location.out";

export interface ListLocationsIn {
  actor: ClassActor;
}

export interface ListLocationsOut {
  items: LocationOut[];
}

export class ListLocations
  implements UseCase<ListLocationsIn, ListLocationsOut>
{
  constructor(private readonly locationRepository: LocationRepository) {}

  async execute(input: ListLocationsIn): Promise<ListLocationsOut> {
    assertCanReadClasses(input.actor);

    const locations = await this.locationRepository.findAll();

    return { items: locations.map(toLocationOut) };
  }
}
