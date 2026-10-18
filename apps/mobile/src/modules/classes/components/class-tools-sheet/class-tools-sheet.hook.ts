import type { UseClassToolsSheetProps } from "./class-tools-sheet.types";

export const useClassToolsSheet = ({
  onClose,
  onEdit,
  onCancel,
}: UseClassToolsSheetProps) => {
  const edit = () => {
    onClose();
    onEdit();
  };

  const cancel = () => {
    onClose();
    onCancel();
  };

  return { edit, cancel };
};
