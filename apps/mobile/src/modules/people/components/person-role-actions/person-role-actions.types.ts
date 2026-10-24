import { PeopleRole, RoleAction } from "../../people.types";

export type PersonRoleActionsProps = {
  /** The role of the person on the sheet: it decides which actions show. */
  role: PeopleRole;
  onSelect: (action: RoleAction) => void;
};
