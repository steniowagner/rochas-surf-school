import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { StackHeaderTitle } from "@/navigation/stack-header";

import { PeopleHeaderTitleProps } from "./people-header-title.types";

/** The People screen's title in the native header, with the total of people above it once it is known. */
export function PeopleHeaderTitle({ count }: PeopleHeaderTitleProps) {
  const { t } = useTranslation();

  return (
    <View className="items-start">
      {count !== undefined ? (
        <Text className="ds-text-section-label text-ink-2">
          {t("people.count", { count })}
        </Text>
      ) : null}
      <StackHeaderTitle title={t("people.title")} />
    </View>
  );
}
