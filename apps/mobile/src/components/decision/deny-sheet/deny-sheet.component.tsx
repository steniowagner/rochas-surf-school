import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";

import { useDenySheet } from "./deny-sheet.hook";
import { DenySheetProps } from "./deny-sheet.types";

export function DenySheet({
  visible,
  title,
  hint,
  label,
  confirmLabel,
  maxLength,
  loading,
  onConfirm,
  onClose,
}: DenySheetProps) {
  const { reason, setReason, confirm, close } = useDenySheet({
    visible,
    onConfirm,
    onClose,
  });

  return (
    <BottomModal visible={visible} onClose={close}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="ds-text-sheet-title text-ink">{title}</Text>
          <Text className="ds-text-body text-ink-2">{hint}</Text>
        </View>
        <TextArea
          label={label}
          value={reason}
          maxLength={maxLength}
          onChangeText={setReason}
        />
        <Button variant="danger" loading={loading} onPress={confirm}>
          {confirmLabel}
        </Button>
      </View>
    </BottomModal>
  );
}
