import type { UseClassToolsSheetProps } from "./class-tools-sheet.types";

export const useClassToolsSheet = ({
  onClose,
  onEdit,
  onCancel,
  onDelete,
}: UseClassToolsSheetProps) => {
  const edit = () => {
    onClose();
    onEdit();
  };

  const cancel = () => {
    onClose();
    onCancel();
  };

  const remove = () => {
    onClose();
    onDelete();
  };

  return { edit, cancel, remove };
};
