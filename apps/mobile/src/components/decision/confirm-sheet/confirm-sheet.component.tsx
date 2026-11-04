import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";

import { useConfirmSheet } from "./confirm-sheet.hook";
import { ConfirmSheetProps } from "./confirm-sheet.types";

export function ConfirmSheet({
  visible,
  title,
  description,
  confirmLabel,
  confirmIcon,
  confirmVariant = "primary",
  cancelLabel,
  loading,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const { description: shownDescription } = useConfirmSheet({
    visible,
    description,
  });

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="mb-4 gap-[4px]">
        <Text className="ds-text-sheet-title text-ink">{title}</Text>
        <Text className="ds-text-body text-ink-2">{shownDescription}</Text>
      </View>

      <View className="gap-2.5">
        <Button
          variant={confirmVariant}
          icon={confirmIcon}
          loading={loading}
          onPress={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" onPress={onClose}>
          {cancelLabel}
        </Button>
      </View>
    </BottomModal>
  );
}
