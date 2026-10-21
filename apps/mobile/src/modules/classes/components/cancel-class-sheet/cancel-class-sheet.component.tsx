import { CLASS_CANCELLATION_MESSAGE_MAX } from "@rochas-surf-school/classes";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";

import { GuestsWarning } from "../guests-warning";

import { useCancelClassSheet } from "./cancel-class-sheet.hook";
import type { CancelClassSheetProps } from "./cancel-class-sheet.types";

export function CancelClassSheet({
  visible,
  loading,
  guestCount = 0,
  onConfirm,
  onClose,
}: CancelClassSheetProps) {
  const { t } = useTranslation();
  const { message, setMessage, confirm, close } = useCancelClassSheet({
    visible,
    onConfirm,
    onClose,
  });

  return (
    <BottomModal visible={visible} onClose={close}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">{t("cancelClass.title")}</Text>
          <Text className="ds-text-body text-ink-2">{t("cancelClass.description")}</Text>
        </View>
        <GuestsWarning count={guestCount} />
        <TextArea
          label={t("cancelClass.messageLabel")}
          placeholder={t("cancelClass.messagePlaceholder")}
          value={message}
          maxLength={CLASS_CANCELLATION_MESSAGE_MAX}
          onChangeText={setMessage}
        />
        <Button variant="danger" loading={loading} onPress={confirm}>
          {t("cancelClass.confirm")}
        </Button>
        <Button variant="ghost" onPress={close}>
          {t("cancelClass.keep")}
        </Button>
      </View>
    </BottomModal>
  );
}
