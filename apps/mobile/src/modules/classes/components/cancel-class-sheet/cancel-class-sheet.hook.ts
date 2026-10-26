import { useState } from "react";
import { useTranslation } from "react-i18next";

import { joinAudience } from "../../utils/audience";

import type { UseCancelClassSheetProps } from "./cancel-class-sheet.types";

export const useCancelClassSheet = ({
  visible,
  studentCount = 0,
  pendingCount = 0,
  instructorCount = 0,
  onConfirm,
  onClose,
}: UseCancelClassSheetProps) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [wasVisible, setWasVisible] = useState(visible);

  // The message never outlives the sheet: whatever closes it (backdrop, drag, success), it opens empty.
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (!visible) {
      setMessage("");
    }
  }

  const confirm = () =>
    onConfirm(message.trim() === "" ? undefined : message.trim());

  const close = () => {
    setMessage("");
    onClose();
  };

  // Who will be told; with nobody to name, the sheet keeps its general sentence.
  const audience = [
    studentCount > 0
      ? t("cancelClass.audience.students", { count: studentCount })
      : null,
    pendingCount > 0
      ? t("cancelClass.audience.pending", { count: pendingCount })
      : null,
    instructorCount > 0
      ? t("cancelClass.audience.instructors", { count: instructorCount })
      : null,
  ].filter((part) => part !== null);
  const description =
    audience.length === 0
      ? t("cancelClass.description")
      : t("cancelClass.descriptionWithAudience", {
          list: joinAudience(audience, t("cancelClass.audience.and")),
        });

  return { message, setMessage, description, confirm, close };
};
