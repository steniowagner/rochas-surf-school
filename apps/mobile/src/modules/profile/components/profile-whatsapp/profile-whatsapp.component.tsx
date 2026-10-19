import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenIntro } from "@/components/ui/screen-intro";
import { WhatsappNumberForm } from "@/components/whatsapp-number-form";
import { useTheme } from "@/hooks/use-theme";
import { useHeaderInset, useKeyboardOffset } from "@/navigation/stack-header";

import { useProfileWhatsapp } from "./profile-whatsapp.hook";

export function ProfileWhatsapp() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const headerInset = useHeaderInset();
  const keyboardOffset = useKeyboardOffset();
  const { whatsappNumber, whatsappVisible, isSaving, submit } =
    useProfileWhatsapp();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
      className="flex-1 bg-page"
    >
      <View
        className="flex-1 px-[22px]"
        style={{
          paddingTop: headerInset,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <WhatsappNumberForm
          header={
            <ScreenIntro
              icon={
                <Ionicons name="logo-whatsapp" size={28} color={theme.grape} />
              }
              title={t("profileWhatsapp.title")}
              description={t("profileWhatsapp.description")}
            />
          }
          initialNumber={whatsappNumber}
          initialVisible={whatsappVisible}
          requireChange
          submitLabel={t("profileWhatsapp.save")}
          isSaving={isSaving}
          onSubmit={submit}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
