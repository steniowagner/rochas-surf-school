export type ClassGuestRowProps = {
  /** `null` for who may not see it and once it was erased: the row shows the "Trial" chip alone. */
  name: string | null;
  /** Admins only, on a class that hasn't started: a "Retirar" button at the right. */
  onTakeOut?: () => void;
};
