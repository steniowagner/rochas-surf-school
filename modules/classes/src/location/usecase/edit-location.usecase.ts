import {
  ConflictError,
  NotFoundError,
  UseCase,
  UuidRule,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { ClassAudienceReader } from "../../school-class/provider/class-audience-reader.provider";
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
    private readonly classAudienceReader: ClassAudienceReader,
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
      await this.notifyAudience(saved.id, saved.name, input.actor.id, now);
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

  /**
   * The instructors and the students with a seat or a request in the upcoming classes, each person once with
   * the larger of their counts, never the editor. A failed notification never changes the answer; the adapter
   * logs it, and a failed read of the students tells the instructors only.
   */
  private async notifyAudience(
    locationId: string,
    locationName: string,
    editorId: string,
    now: Date,
  ): Promise<void> {
    try {
      const counts = new Map<string, number>();
      const add = (userId: string, count: number) =>
        counts.set(userId, Math.max(counts.get(userId) ?? 0, count));

      for (const { instructorId, count } of await this.locationRepository.findUpcomingInstructorCounts(
        locationId,
        now,
      )) {
        add(instructorId, count);
      }

      for (const { userId, count } of await this.findStudents(locationId, now)) {
        add(userId, count);
      }

      counts.delete(editorId);

      if (counts.size === 0) return;

      const recipients = [...counts].map(([userId, count]) => ({ userId, count }));

      await this.locationChangeNotifier.locationChanged({ recipients, locationName });
    } catch {
      // swallowed on purpose
    }
  }

  private async findStudents(locationId: string, now: Date) {
    try {
      return await this.classAudienceReader.findLocationAudience(locationId, now);
    } catch {
      return [];
    }
  }
}
