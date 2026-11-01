import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenIntro } from "@/components/ui/screen-intro";
import { WhatsappNumberForm } from "@/components/whatsapp-number-form";
import { useTheme } from "@/hooks/use-theme";
import { getBottomPadding, getKeyboardGapOffset } from "@/utils/bottom-padding";

import { useWhatsapp } from "./whatsapp.hook";

export function Whatsapp() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = getBottomPadding(insets.bottom, 24);
  const { firstName, isSaving, submit } = useWhatsapp();

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={getKeyboardGapOffset(bottomPadding)}
      className="flex-1 bg-page"
    >
      <View
        className="flex-1 px-screen"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: bottomPadding,
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
