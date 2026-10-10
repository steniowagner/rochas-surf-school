export type UsePendingResult = {
  email: string;
  /** The "Account created" time label; null when the date is invalid. */
  createdAtLabel: string | null;
  signOut: () => void;
};
