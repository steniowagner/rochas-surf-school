import { useSignOut } from "@/modules/auth/hooks/use-sign-out.hook";

import { UseSignOutSheetProps } from "./sign-out-sheet.types";

export const useSignOutSheet = ({ onClose }: UseSignOutSheetProps) => {
  const { signOut } = useSignOut();

  const confirm = () => {
    onClose();
    signOut();
  };

  return { confirm };
};
