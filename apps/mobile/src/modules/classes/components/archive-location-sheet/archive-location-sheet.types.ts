export type ArchiveLocationSheetProps = {
  visible: boolean;
  name: string;
  address: string;
  /** Classes that start later and use the location: the sheet says they stay as they are. */
  upcomingClasses: number;
  loading: boolean;
  onConfirm: () => void;
  /** "Manter". */
  onClose: () => void;
};
