import { Ionicons } from "@expo/vector-icons";
import { Trans, useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import { ScreenIntro } from "@/components/ui/screen-intro";
import { TextButton } from "@/components/ui/text-button";
import { useTheme } from "@/hooks/use-theme";

import { CODE_LENGTH, useConfirmCode } from "./confirm-code.hook";
import { ConfirmCodeProps } from "./confirm-code.types";

export function ConfirmCode({ email, name, onVerified }: ConfirmCodeProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    code,
    isCountingDown,
    countdown,
    resend,
    errorMessage,
    isVerifying,
    inputRef,
    changeCode,
    confirm,
    changeEmail,
  } = useConfirmCode({ email, name, onVerified });

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
                name="mail-open-outline"
                size={28}
                color={theme.grape}
              />
            }
            title={t("confirmCode.title")}
            description={
              <Trans
                i18nKey="confirmCode.description"
                t={t}
                values={{ email }}
                components={{
                  bold: <Text className="font-body-800 text-ink" />,
                }}
              />
            }
          />

          <View className="gap-2">
            <OtpInput
              autoFocus
              accessibilityLabel={t("confirmCode.inputLabel")}
              editable={!isVerifying}
              inputRef={inputRef}
              length={CODE_LENGTH}
              onChangeText={changeCode}
              status={errorMessage ? "error" : "neutral"}
              value={code}
            />
            <Text className="ds-text-list-subtitle min-h-5 px-1 text-bad">
              {errorMessage}
            </Text>
          </View>
        </View>

        <View className="min-h-6 flex-1" />

        <View className="gap-3.5">
          <Button
            className="min-h-[54px] rounded-full"
            disabled={code.length < CODE_LENGTH}
            loading={isVerifying}
            onPress={confirm}
          >
            {t("confirmCode.submit")}
          </Button>

          <Text className="ds-text-list-subtitle text-center text-ink-2">
            {isCountingDown ? (
              t("confirmCode.resendIn", { time: countdown })
            ) : (
              <TextButton onPress={resend}>
                {t("confirmCode.resend")}
              </TextButton>
            )}
          </Text>

          <View className="flex-row items-start gap-2.5 rounded-card border border-line bg-dim p-3.5">
            <Ionicons
              name="information-circle-outline"
              size={17}
              color={theme.ink2}
            />
            <Text className="ds-text-list-subtitle flex-1 text-ink-2">
              <Trans
                i18nKey="confirmCode.notReceived"
                t={t}
                components={{ change: <TextButton onPress={changeEmail} /> }}
              />
            </Text>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
