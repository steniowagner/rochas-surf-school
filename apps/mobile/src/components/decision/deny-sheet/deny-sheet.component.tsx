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
  summary,
  hint,
  label,
  showLabel = false,
  hideReason = false,
  hideConfirmIcon = false,
  placeholder,
  backLabel,
  backVariant = "subtle",
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
        <View className={summary ? "gap-3" : "gap-1"}>
          <Text className="ds-text-sheet-title text-ink">{title}</Text>
          {summary}
          <Text className="ds-text-body text-ink-2">{hint}</Text>
        </View>
        {hideReason ? null : (
          <TextArea
            inBottomSheet
            label={showLabel ? label : undefined}
            accessibilityLabel={label}
            placeholder={placeholder}
            value={reason}
            maxLength={maxLength}
            onChangeText={setReason}
          />
        )}
        <View className="gap-2">
          <Button
            variant="danger"
            icon={
              hideConfirmIcon ? undefined : (
                <Feather name="x-circle" size={16} color={theme.onColor} />
              )
            }
            loading={loading}
            onPress={confirm}
          >
            {confirmLabel}
          </Button>
          <Button variant={backVariant} onPress={close}>
            {backLabel}
          </Button>
        </View>
      </View>
    </BottomModal>
  );
}
