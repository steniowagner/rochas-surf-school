import {
  Entity,
  EntityState,
  PhoneNumberRule,
  RequiredRule,
  Validator,
} from "@rochas-surf-school/shared";

// One school, one settings row: every save writes this id.
export const SCHOOL_SETTINGS_ID = "00000000-0000-4000-8000-000000000001";

export interface SchoolSettingsState extends EntityState {
  whatsappNumber?: string;
  // On by default: a row that never set the switch keeps the waiting list open.
  waitingListEnabled?: boolean;
}

export class SchoolSettings extends Entity<SchoolSettingsState> {
  constructor(props: SchoolSettingsState) {
    super(props);
  }

  get whatsappNumber(): string | undefined {
    return this.props.whatsappNumber;
  }

  get waitingListEnabled(): boolean {
    return this.props.waitingListEnabled ?? true;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "schoolSettings.whatsappNumber",
        value: this.whatsappNumber,
        rules: [new RequiredRule(), new PhoneNumberRule()],
      },
    ]);
  }
}
