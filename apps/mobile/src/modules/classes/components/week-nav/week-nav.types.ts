export type WeekNavProps = {
  /** "12 Oct – 18 Oct". */
  caption: string;
  /** "Today" shows only while another week is shown. */
  showToday: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};
