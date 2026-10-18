import {
  ConflictError,
  NotFoundError,
  UseCase,
  UuidRule,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { ClockProvider } from "../../school-class/provider/clock.provider";
import { Location } from "../model";
import { LocationChangeNotifier, LocationRepository } from "../provider";
import { LocationOut, toLocationOut } from "./location.out";
import { toCoordinate } from "./create-location.usecase";

export interface EditLocationIn {
  actor: ClassActor;
  id: string;
  name: unknown;
  address: unknown;
  latitude: unknown;
  longitude: unknown;
  notify?: unknown;
}

const uuidRule = new UuidRule();

export class EditLocation implements UseCase<EditLocationIn, LocationOut> {
  constructor(
    private readonly locationRepository: LocationRepository,
    private readonly locationChangeNotifier: LocationChangeNotifier,
    private readonly clock: ClockProvider,
  ) {}

  async execute(input: EditLocationIn): Promise<LocationOut> {
    assertCanManageClasses(input.actor);

    const stored =
      typeof input.id === "string" && uuidRule.validate(input.id) === null
        ? await this.locationRepository.findById(input.id)
        : null;

    if (!stored) {
      throw new NotFoundError("location.notFound");
    }

    const edited = stored.clone({
      name: typeof input.name === "string" ? input.name : "",
      address: typeof input.address === "string" ? input.address : "",
      latitude: toCoordinate(input.latitude),
      longitude: toCoordinate(input.longitude),
    });
    const errors = this.shapeErrors(edited, input.notify);

    if (errors.length > 0) {
      throw new ValidationException(errors.map((key) => new ValidationError(key)));
    }

    if (stored.isArchived) {
      throw new ConflictError("location.archived");
    }

    if (
      edited.nameKey !== stored.nameKey &&
      (await this.locationRepository.existsByNameKey(edited.nameKey))
    ) {
      throw new ConflictError("location.name.duplicate");
    }

    const now = this.clock.now();
    const nameOrAddressChanged =
      edited.name !== stored.name || edited.address !== stored.address;
    const changed =
      nameOrAddressChanged ||
      edited.latitude !== stored.latitude ||
      edited.longitude !== stored.longitude;

    if (!changed) {
      return this.toOut(stored.id, stored, now);
    }

    const saved = await this.locationRepository.update(edited, {
      clearDeadlinesFrom: nameOrAddressChanged ? now : null,
    });

    if (input.notify === true) {
      await this.notifyInstructors(saved.id, saved.name, input.actor.id, now);
    }

    return this.toOut(saved.id, saved, now);
  }

  private shapeErrors(edited: Location, notify: unknown): string[] {
    const errors: string[] = [];

    try {
      edited.validate();
    } catch (error) {
      errors.push(...(error as ValidationException).errors.map((item) => item.message));
    }

    if (notify !== undefined && typeof notify !== "boolean") {
      errors.push("location.notify.invalid");
    }

    return errors;
  }

  private async toOut(id: string, location: Location, now: Date) {
    const active = await this.locationRepository.findActive(now);
    const upcoming = active
      .filter((item) => item.location.id === id)
      .reduce((total, item) => total + item.upcomingClasses, 0);

    return toLocationOut(location, upcoming);
  }

  /** A failed notification never changes the answer; the adapter logs it. */
  private async notifyInstructors(
    locationId: string,
    locationName: string,
    editorId: string,
    now: Date,
  ): Promise<void> {
    try {
      const counts = await this.locationRepository.findUpcomingInstructorCounts(locationId, now);
      const recipients = counts.filter((item) => item.instructorId !== editorId);

      if (recipients.length === 0) return;

      await this.locationChangeNotifier.locationChanged({ recipients, locationName });
    } catch {
      // swallowed on purpose
    }
  }
}
