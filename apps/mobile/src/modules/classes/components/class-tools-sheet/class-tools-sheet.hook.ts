import { useTranslation } from "react-i18next";

import type {
  ClassToolsDeleteState,
  UseClassToolsSheetProps,
} from "./class-tools-sheet.types";

const DELETE_SUBTITLE_KEYS = {
  available: "classTools.deleteEmpty",
  started: "classTools.deleteStarted",
  enrolled: "classTools.deleteEnrolled",
} as const satisfies Record<ClassToolsDeleteState, string>;

export const useClassToolsSheet = ({
  onClose,
  onEdit,
  onCancel,
  onDelete,
  messageCount,
  deleteState,
}: UseClassToolsSheetProps) => {
  const { t } = useTranslation();

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

  return {
    edit,
    cancel,
    remove,
    messageSubtitle:
      messageCount > 0
        ? t("classTools.people", { count: messageCount })
        : t("classTools.nobody"),
    cancelSubtitle:
      messageCount > 0
        ? t("classTools.notifies", { count: messageCount })
        : t("classTools.nobodyToNotify"),
    deleteSubtitle: t(DELETE_SUBTITLE_KEYS[deleteState]),
    canDelete: deleteState === "available",
  };
};
