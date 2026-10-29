export type OccupancyStatProps = {
  /** "65%", "22/34"… */
  value: string;
  /** "Ocupação". */
  label: string;
  /** The text color class of the value, e.g. `text-grape`. */
  valueClassName: string;
  /** Draws the vertical divider at the stat's left. */
  hasDivider: boolean;
};
