export type OccupancyWeekBarProps = {
  /** "THIS WEEK", "NEXT WEEK", "2 WEEKS AGO"… */
  relativeLabel: string;
  /** The label is the current week's, the only one in the sun colour. */
  isCurrentWeek: boolean;
  /** "19 – 25 OCT". */
  caption: string;
  /** Opens the calendar to pick another week. */
  onPress: () => void;
};
