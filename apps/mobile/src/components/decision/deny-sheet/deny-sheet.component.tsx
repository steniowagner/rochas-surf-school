import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-area";
import { useTheme } from "@/hooks/use-theme";

import { useDenySheet } from "./deny-sheet.hook";
import { DenySheetProps } from "./deny-sheet.types";

export function DenySheet({
  visible,
  title,
  hint,
  label,
  showLabel = false,
  placeholder,
  backLabel,
  confirmLabel,
  maxLength,
  loading,
  onConfirm,
  onClose,
}: DenySheetProps) {
  const theme = useTheme();
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
          inBottomSheet
          label={showLabel ? label : undefined}
          accessibilityLabel={label}
          placeholder={placeholder}
          value={reason}
          maxLength={maxLength}
          onChangeText={setReason}
        />
        <View className="gap-2">
          <Button
            variant="danger"
            icon={<Feather name="x-circle" size={16} color={theme.onColor} />}
            loading={loading}
            onPress={confirm}
          >
            {confirmLabel}
          </Button>
          <Button variant="subtle" onPress={close}>
            {backLabel}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
}
