import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import type { CountryOption } from "../../utils/countries.types";

import { useCountryPicker } from "./country-picker.hook";
import { CountryPickerProps } from "./country-picker.types";

const LIST_HEIGHT_RATIO = 0.45;

export function CountryPicker({
  visible,
  onClose,
  onSelect,
}: CountryPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const { query, setQuery, visibleOptions, close, select } = useCountryPicker({
    onClose,
    onSelect,
  });

  const renderItem = ({ item }: { item: CountryOption }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name} ${item.dialCode}`}
      onPress={() => select(item.code)}
      className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
    >
      <Text className="ds-text-list-title flex-1 text-ink">{item.name}</Text>
      <Text className="ds-text-body text-ink-2">{item.dialCode}</Text>
    </Pressable>
  );

  return (
    <BottomModal visible={visible} onClose={close}>
      <View className="mb-3.5 gap-3.5">
        <Text accessibilityRole="header" className="ds-text-sheet-title text-ink">
          {t("whatsapp.pickerTitle")}
        </Text>
        <TextInput
          icon={<Ionicons name="search" size={19} color={theme.ink2} />}
          value={query}
          onChangeText={setQuery}
          placeholder={t("whatsapp.pickerSearch")}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      <BottomSheetFlatList
        data={visibleOptions}
        keyExtractor={(item: CountryOption) => item.code}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        style={{ height: height * LIST_HEIGHT_RATIO }}
      />
    </BottomModal>
  );
}
