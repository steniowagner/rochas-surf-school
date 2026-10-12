import { DecidedItem } from "@/components/decision/decided-list/decided-list.types";

import { Registration } from "../registrations.types";

export type RegistrationAction = "approve" | "deny";

export type UseRegistrationsScreenResult = {
  registrations: Registration[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  /** The card being sent, by id, and what is being sent. */
  sending: Record<string, RegistrationAction>;
  /** The decisions of this visit to the screen, newest first. */
  decided: DecidedItem[];
  /** The registration whose deny sheet is open. */
  denying: Registration | null;
  retry: () => void;
  refresh: () => void;
  approve: (registration: Registration) => void;
  openDeny: (registration: Registration) => void;
  closeDeny: () => void;
  confirmDeny: (reason: string) => void;
};
