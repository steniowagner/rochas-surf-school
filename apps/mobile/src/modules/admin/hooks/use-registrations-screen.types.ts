import { Registration } from "../registrations.types";

export type RegistrationAction = "approve" | "deny";

export type UseRegistrationsScreenResult = {
  registrations: Registration[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  /** The card being sent, by id, and what is being sent. */
  sending: Record<string, RegistrationAction>;
  /** The registration whose deny sheet is open. */
  denying: Registration | null;
  /** The registration whose detail sheet is open (or sliding away). */
  selected: Registration | null;
  isSheetVisible: boolean;
  openRegistration: (registration: Registration) => void;
  closeSheet: () => void;
  retry: () => void;
  refresh: () => void;
  approve: (registration: Registration) => void;
  openDeny: (registration: Registration) => void;
  closeDeny: () => void;
  confirmDeny: (reason: string) => void;
};
