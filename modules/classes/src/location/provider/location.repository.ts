import { Location } from "../model";

export interface ActiveLocation {
  location: Location;
  /** Classes at the location that start after `now` and aren't cancelled. */
  upcomingClasses: number;
}

export interface UpcomingInstructorCount {
  instructorId: string;
  count: number;
}

export interface LocationUpdateOptions {
  /** Clears the deadline of the location's upcoming classes (start after this date, not cancelled), or none. */
  clearDeadlinesFrom: Date | null;
}

export interface LocationRepository {
  /** Active locations only, sorted by name key then id. */
  findActive(now: Date): Promise<ActiveLocation[]>;
  /** An active or an archived location. */
  findById(id: string): Promise<Location | null>;
  /** Whether an **active** location has the name key. */
  existsByNameKey(nameKey: string): Promise<boolean>;
  create(location: Location): Promise<Location>;
  update(location: Location, options: LocationUpdateOptions): Promise<Location>;
  /** Archives an active location and frees its name; false when it was already archived or doesn't exist. */
  archive(id: string): Promise<boolean>;
  findUpcomingInstructorCounts(locationId: string, now: Date): Promise<UpcomingInstructorCount[]>;
}
