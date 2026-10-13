import { useDeleteAccount } from "../../hooks/use-delete-account.hook";

import { UseDeleteAccountSheetProps } from "./delete-account-sheet.types";

export const useDeleteAccountSheet = ({
  onClose,
}: UseDeleteAccountSheetProps) => {
  const deleteAccount = useDeleteAccount();

  // The button ignores presses while it is loading, so a second confirmation can't start another request.
  const confirm = () => {
    deleteAccount.mutate(undefined, { onSuccess: onClose });
  };

  return { confirm, isDeleting: deleteAccount.isPending };
};
