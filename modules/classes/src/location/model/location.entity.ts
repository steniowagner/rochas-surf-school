import {
  Entity,
  EntityState,
  MaxLengthRule,
  RequiredRule,
  ValidationRule,
  Validator,
} from "@rochas-surf-school/shared";
import {
  LOCATION_ADDRESS_MAX,
  LOCATION_NAME_MAX,
  normalizeLocationName,
} from "./location-name";

export interface LocationState extends EntityState {
  name: string;
  address: string;
  nameKey?: string;
  latitude?: number | null;
  longitude?: number | null;
  archivedAt?: Date | null;
}

export const LATITUDE_LIMIT = 90;
export const LONGITUDE_LIMIT = 180;

function isCoordinate(value: unknown, limit: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** Reads `{ latitude, longitude }`: either one absent is `required`, a bad number or out of range is `invalid`. */
class PointRule implements ValidationRule {
  validate(value: unknown): string | null {
    const { latitude, longitude } = value as { latitude: unknown; longitude: unknown };

    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return "required";
    }

    return isCoordinate(latitude, LATITUDE_LIMIT) && isCoordinate(longitude, LONGITUDE_LIMIT)
      ? null
      : "invalid";
  }
}

export class Location extends Entity<LocationState> {
  constructor(props: LocationState) {
    const name = props.name.trim();

    super({
      ...props,
      name,
      address: props.address.trim(),
      nameKey: normalizeLocationName(name),
      latitude: props.latitude ?? null,
      longitude: props.longitude ?? null,
      archivedAt: props.archivedAt ? new Date(props.archivedAt.getTime()) : null,
    });
  }

  get name(): string {
    return this.props.name;
  }

  get address(): string {
    return this.props.address;
  }

  get nameKey(): string {
    return this.props.nameKey!;
  }

  get latitude(): number | null {
    return this.props.latitude!;
  }

  get longitude(): number | null {
    return this.props.longitude!;
  }

  get archivedAt(): Date | null {
    return this.props.archivedAt ? new Date(this.props.archivedAt.getTime()) : null;
  }

  get isArchived(): boolean {
    return this.props.archivedAt !== null;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "location.name",
        value: this.name,
        rules: [new RequiredRule(), new MaxLengthRule(LOCATION_NAME_MAX)],
      },
      {
        code: "location.address",
        value: this.address,
        rules: [new RequiredRule(), new MaxLengthRule(LOCATION_ADDRESS_MAX)],
      },
      {
        code: "location.point",
        value: { latitude: this.latitude, longitude: this.longitude },
        rules: [new PointRule()],
      },
    ]);
  }
}
