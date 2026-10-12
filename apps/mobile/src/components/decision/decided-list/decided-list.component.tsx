import { Text, View } from "react-native";

import { Chip } from "@/components/ui/chip";

import { DecidedListProps } from "./decided-list.types";

export function DecidedList({ title, items }: DecidedListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View className="gap-2">
      <Text className="ds-text-section-label text-ink-2">{title}</Text>
      <View className="rounded-card border border-line bg-surface px-4">
        {items.map((item, index) => (
          <View
            key={item.id}
            className={`min-h-11 flex-row items-center justify-between gap-3 py-3 ${
              index > 0 ? "border-t border-line" : ""
            }`}
          >
            <Text className="ds-text-list-title flex-1 text-ink">
              {item.title}
            </Text>
            <Chip tone={item.tone}>{item.tag}</Chip>
          </View>
        ))}
      </View>
    </View>
  );
}
