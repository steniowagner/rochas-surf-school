import { PeopleRole } from "../../people.types";

export type RoleFiltersProps = {
  /** The selected roles; none means the list isn't filtered. */
  roles: PeopleRole[];
  /** Pressing a role selects it, pressing it while selected unselects it. */
  onToggle: (role: PeopleRole) => void;
};
