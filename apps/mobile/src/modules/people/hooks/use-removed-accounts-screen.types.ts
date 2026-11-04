import { RemovedAccount } from "../people.types";

export type RemovedAccountsStatus = "loading" | "error" | "empty" | "ready";

export type UseRemovedAccountsScreenResult = {
  accounts: RemovedAccount[];
  status: RemovedAccountsStatus;
  isRefreshing: boolean;
  /** True while the retry of a failed load runs. */
  isRetrying: boolean;
  selected: RemovedAccount | null;
  isSheetVisible: boolean;
  openAccount: (account: RemovedAccount) => void;
  closeSheet: () => void;
  /** The account being restored; the other buttons wait until it is done. */
  restoringId: string | null;
  /** The account whose restore confirmation sheet is open. */
  restoreCandidate: RemovedAccount | null;
  /** Opens the restore confirmation sheet; nothing is sent until it is confirmed. */
  openRestore: (account: RemovedAccount) => void;
  closeRestore: () => void;
  confirmRestore: () => void;
  retry: () => void;
  refresh: () => Promise<void>;
};
