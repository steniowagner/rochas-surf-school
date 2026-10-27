import { PeopleRole, RoleAction } from "../../people.types";

export type PersonRoleActionsProps = {
  /** The role of the person on the sheet: it decides which actions show. */
  role: PeopleRole;
  onSelect: (action: RoleAction) => void;
  /** The last action: removes the person from the platform (spec 066, D-08). */
  onRemove: () => void;
};
