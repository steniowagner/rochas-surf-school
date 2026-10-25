import type { DisciplineFilterProps } from "../discipline-filter/discipline-filter.types";

export type DisciplineFilterHeaderButtonProps = DisciplineFilterProps;

export type UseDisciplineFilterHeaderButtonProps = Pick<
  DisciplineFilterHeaderButtonProps,
  "onChange"
>;
