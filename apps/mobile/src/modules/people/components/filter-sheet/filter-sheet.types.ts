import { PeopleRoleFilter } from "../../hooks/use-people-screen.types";
import { PeopleSort } from "../../people.types";

export type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  role: PeopleRoleFilter;
  sort: PeopleSort;
  onRoleChange: (role: PeopleRoleFilter) => void;
  onSortChange: (sort: PeopleSort) => void;
};
