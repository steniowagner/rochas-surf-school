import { PeopleRole } from "../../people.types";

export type RemoveConfirmationProps = {
  /** The role of the person being removed: a student's text is about seats, the others' about classes. */
  role: PeopleRole;
  /** The person's first name, for the title. */
  name: string;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
};
