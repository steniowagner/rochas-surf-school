import { PeopleRoleFilter } from "../../hooks/use-people-screen.types";
import { PeopleSort } from "../../people.types";

export type FilterBarProps = {
  role: PeopleRoleFilter;
  sort: PeopleSort;
  onOpen: () => void;
  /** Pressing the role chip goes back to "all". */
  onClearRole: () => void;
  /** Pressing the sort chip goes back to the ingress date. */
  onClearSort: () => void;
};
