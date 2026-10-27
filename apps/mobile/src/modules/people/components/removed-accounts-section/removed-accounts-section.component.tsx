import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { RemovedAccountRow } from "../removed-account-row";

import { RemovedAccountsSectionProps } from "./removed-accounts-section.types";

/** The end of the People list for admins: the removed accounts that can still be restored. */
export function RemovedAccountsSection({ accounts }: RemovedAccountsSectionProps) {
  const { t } = useTranslation();

  return (
    <View className="mt-8">
      <Text accessibilityRole="header" className="ds-text-section-label text-ink">
        {t("people.removed.title")}
      </Text>
      <Text className="ds-text-list-subtitle mb-2 text-ink-2">{t("people.removed.hint")}</Text>
      {accounts.map((account, index) => (
        <RemovedAccountRow
          key={account.id}
          account={account}
          isFirst={index === 0}
          isLast={index === accounts.length - 1}
        />
      ))}
    </View>
  );
}
