import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";
import { useKeyboardOffset } from "@/navigation/stack-header";

import { useGoogleName } from "./google-name.hook";
import { GoogleNameProps } from "./google-name.types";

export function GoogleName({
  idToken,
  initialName,
  onSignedIn,
}: GoogleNameProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const { nameField, canSubmit, isSending, submit } = useGoogleName({
    idToken,
    initialName,
    onSignedIn,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
      className="flex-1 bg-page"
    >
      <View
        className="flex-1 px-[22px]"
        style={{
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <View className="mt-6 gap-4">
          <ScreenIntro
            icon={
              <Ionicons
                name="person-add-outline"
                size={28}
                color={theme.grape}
              />
            }
            title={t("googleName.title")}
            description={t("googleName.description")}
          />

          <TextInput
            icon={
              <Ionicons name="person-outline" size={20} color={theme.ink2} />
            }
            placeholder={t("createAccount.namePlaceholder")}
            autoComplete="name"
            returnKeyType="done"
            onSubmitEditing={submit}
            {...nameField}
          />
        </View>

        <View className="min-h-6 flex-1" />

        <Button disabled={!canSubmit} loading={isSending} onPress={submit}>
          {t("googleName.submit")}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
