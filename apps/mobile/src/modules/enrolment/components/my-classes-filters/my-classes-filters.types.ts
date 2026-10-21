import type { MyClassesFilter } from "../../enrolment.types";

export type MyClassesFiltersProps = {
  selected: MyClassesFilter;
  onSelect: (filter: MyClassesFilter) => void;
};
