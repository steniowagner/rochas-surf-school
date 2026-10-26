import { ReactivationRequest } from "../reactivations.types";

export type ReactivationsStatus = "loading" | "error" | "empty" | "ready";

export type ReactivationAction = "approve" | "deny";

export type UseReactivationsScreenResult = {
  requests: ReactivationRequest[];
  status: ReactivationsStatus;
  /** True while the retry of a failed first load runs. */
  isRetrying: boolean;
  isRefreshing: boolean;
  /** The card being sent, by id, and what is being sent. */
  sending: Record<string, ReactivationAction>;
  /** The request whose deny sheet is open. */
  denying: ReactivationRequest | null;
  /** The request whose detail sheet is open (or sliding away). */
  selected: ReactivationRequest | null;
  isSheetVisible: boolean;
  openRequest: (request: ReactivationRequest) => void;
  closeSheet: () => void;
  retry: () => void;
  refresh: () => void;
  approve: (request: ReactivationRequest) => void;
  openDeny: (request: ReactivationRequest) => void;
  closeDeny: () => void;
  confirmDeny: (reason: string) => void;
};
