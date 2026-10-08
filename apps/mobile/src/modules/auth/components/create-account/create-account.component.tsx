import { Ionicons } from "@expo/vector-icons";
import { useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput as NativeTextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { TextButton } from "@/components/ui/text-button";
import { TextInput } from "@/components/ui/text-input";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import { useCreateAccount } from "./create-account.hook";
import { CreateAccountProps } from "./create-account.types";

export function CreateAccount({ onCodeRequested }: CreateAccountProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const emailInputRef = useRef<NativeTextInput>(null);
  const { nameField, emailField, canSubmit, isSending, submit } =
    useCreateAccount({
      onCodeRequested,
    });

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
        <BackButton />

        <View className="mt-6 gap-4">
          <ScreenIntro
            icon={
              <Ionicons
                name="person-add-outline"
                size={28}
                color={theme.grape}
              />
            }
            title={t("createAccount.title")}
            description={t("createAccount.subtitle")}
          />

          <View className="gap-3">
            <TextInput
              icon={
                <Ionicons name="person-outline" size={20} color={theme.ink2} />
              }
              placeholder={t("createAccount.namePlaceholder")}
              autoComplete="name"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              {...nameField}
            />
            <TextInput
              ref={emailInputRef}
              icon={
                <Ionicons name="mail-outline" size={20} color={theme.ink2} />
              }
              placeholder={t("createAccount.emailPlaceholder")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="done"
              onSubmitEditing={submit}
              {...emailField}
            />
          </View>
        </View>

        <View className="min-h-6 flex-1" />

        <View className="gap-3.5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("createAccount.submit")}
            accessibilityState={{ disabled: !canSubmit }}
            activeOpacity={BUTTON_ACTIVE_OPACITY}
            disabled={!canSubmit || isSending}
            onPress={submit}
            className={`min-h-[54px] items-center justify-center rounded-full ${canSubmit ? "bg-sun" : "bg-sand"}`}
            style={canSubmit ? shadowStyle("primary", theme) : null}
          >
            {isSending ? (
              <ActivityIndicator color={theme.onColor} />
            ) : (
              <Text
                className={`ds-text-button ${canSubmit ? "text-on-color" : "text-ink-2"}`}
              >
                {t("createAccount.submit")}
              </Text>
            )}
          </TouchableOpacity>

          <Text className="ds-text-list-subtitle mx-2 text-center text-ink-2">
            {/* `t` makes the element depend on the language: Trans doesn't re-render on language changes by itself. */}
            <Trans
              i18nKey="auth.terms"
              t={t}
              components={{
                terms: <TextButton />,
                privacy: <TextButton />,
              }}
            />
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
