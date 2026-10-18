import { UseCase } from "@rochas-surf-school/shared";
import { ClassActor, assertCanReadClasses } from "../../access";
import { ClockProvider } from "../../school-class/provider/clock.provider";
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
  constructor(
    private readonly locationRepository: LocationRepository,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: ListLocationsIn): Promise<ListLocationsOut> {
    assertCanReadClasses(input.actor);

    const locations = await this.locationRepository.findActive(this.clock.now());

    return {
      items: locations.map((item) => toLocationOut(item.location, item.upcomingClasses)),
    };
  }
}
