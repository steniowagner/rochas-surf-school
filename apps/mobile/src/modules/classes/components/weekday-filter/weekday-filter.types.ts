export type WeekdayFilterProps = {
  /** The ISO weekdays (1 Monday to 7 Sunday) that are on. */
  weekdays: number[];
  onChange: (weekdays: number[]) => void;
};

export type UseWeekdayFilterProps = WeekdayFilterProps;
