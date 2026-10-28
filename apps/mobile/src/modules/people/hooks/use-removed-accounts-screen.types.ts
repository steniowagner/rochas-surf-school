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
  restore: (account: RemovedAccount) => Promise<void>;
  retry: () => void;
  refresh: () => Promise<void>;
};
