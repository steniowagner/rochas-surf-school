import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenIntro } from "@/components/ui/screen-intro";
import { WhatsappNumberForm } from "@/components/whatsapp-number-form";
import { useTheme } from "@/hooks/use-theme";

import { useWhatsapp } from "./whatsapp.hook";

export function Whatsapp() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { firstName, isSaving, submit } = useWhatsapp();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-page"
    >
      <View
        className="flex-1 px-[22px]"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <WhatsappNumberForm
          header={
            <ScreenIntro
              icon={<Ionicons name="checkmark" size={30} color={theme.ok} />}
              iconTileClassName="bg-ok-tint"
              eyebrow={t("whatsapp.eyebrow")}
              eyebrowClassName="text-ok"
              title={t("whatsapp.title", { firstName })}
              description={t("whatsapp.description")}
            />
          }
          submitLabel={t("whatsapp.submit")}
          isSaving={isSaving}
          onSubmit={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
