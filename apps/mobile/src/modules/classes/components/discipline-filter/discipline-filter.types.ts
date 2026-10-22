import type { DisciplineFilterValue } from "../../classes.types";

export type DisciplineFilterProps = {
  value: DisciplineFilterValue;
  onChange: (value: DisciplineFilterValue) => void;
};

export type UseDisciplineFilterProps = Pick<DisciplineFilterProps, "onChange">;
