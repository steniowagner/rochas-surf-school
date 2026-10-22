import type { DisciplineFilterProps } from "../discipline-filter/discipline-filter.types";

export type DisciplineFilterMenuProps = DisciplineFilterProps;

export type UseDisciplineFilterMenuProps = Pick<
  DisciplineFilterMenuProps,
  "onChange"
>;
