export type OccupancyStatProps = {
  testID: string;
  /** "65%", "22/34"… */
  value: string;
  /** "Occupancy". */
  label: string;
  accessibilityLabel: string;
  /** The text colour class of the value, e.g. `text-grape`. */
  valueClassName: string;
  /** Draws the vertical divider at the stat's left. */
  hasDivider: boolean;
};
