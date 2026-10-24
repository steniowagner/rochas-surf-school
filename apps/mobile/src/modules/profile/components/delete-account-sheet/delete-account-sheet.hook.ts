import { router } from "expo-router";
import { useState } from "react";

import { routes } from "@/constants/routes";
import { useSession } from "@/providers/session";

import { useAdminsCount } from "../../hooks/use-admins-count.hook";
import { useDeleteAccount } from "../../hooks/use-delete-account.hook";
import { isLastAdminError } from "../../utils/last-admin-error";

import { UseDeleteAccountSheetProps } from "./delete-account-sheet.types";

export const useDeleteAccountSheet = ({
  visible,
  onClose,
}: UseDeleteAccountSheetProps) => {
  const { user } = useSession();
  const deleteAccount = useDeleteAccount();
  // Only an admin can be the school's last one: the count is read when their sheet opens (spec 058, D-14).
  const isAdmin = user?.role === "admin";
  const adminsCount = useAdminsCount(visible && isAdmin);
  const [refused, setRefused] = useState(false);

  const close = () => {
    setRefused(false);
    onClose();
  };

  // The button ignores presses while it is loading, so a second confirmation can't start another request.
  const confirm = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: close,
      onError: (error) => {
        if (isLastAdminError(error)) {
          setRefused(true);
        }
      },
    });
  };

  const goToPeople = () => {
    close();
    router.push(routes.admin.people);
  };

  return {
    confirm,
    close,
    goToPeople,
    isDeleting: deleteAccount.isPending,
    // While the count loads, or if it failed, the normal confirmation shows: the backend still refuses.
    isOnlyAdmin: refused || (isAdmin && adminsCount.data === 1),
  };
};
