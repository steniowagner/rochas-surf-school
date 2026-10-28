import { RemovedAccount } from "../../people.types";

export type RemovedAccountRowProps = {
  account: RemovedAccount;
  /** Opens the account's details. */
  onPress: (account: RemovedAccount) => void;
  onRestore: (account: RemovedAccount) => void;
  /** This account is the one being restored: its button shows the spinner. */
  isRestoring: boolean;
  /** Another account is being restored: the button waits. */
  disabled: boolean;
};
