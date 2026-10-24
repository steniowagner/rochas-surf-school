import { RoleAction } from "../../people.types";

export type RoleChangeConfirmationProps = {
  action: RoleAction;
  /** The person's first name, for the title. */
  name: string;
  /** Adds the sentence about the seats and requests given up (a student made admin). */
  showSeatsNote: boolean;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
};
