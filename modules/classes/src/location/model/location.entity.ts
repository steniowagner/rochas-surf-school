import {
  Entity,
  EntityState,
  MaxLengthRule,
  RequiredRule,
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
}

export class Location extends Entity<LocationState> {
  constructor(props: LocationState) {
    const name = props.name.trim();

    super({
      ...props,
      name,
      address: props.address.trim(),
      nameKey: normalizeLocationName(name),
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
    ]);
  }
}
