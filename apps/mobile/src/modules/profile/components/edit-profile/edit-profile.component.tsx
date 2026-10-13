import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { useTheme } from "@/hooks/use-theme";

import { ProfileAvatar } from "../profile-avatar";

import { useEditProfile } from "./edit-profile.hook";

export function EditProfile() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    currentName,
    email,
    nameField,
    canSubmit,
    isSaving,
    submit,
    showComingSoon,
  } = useEditProfile();

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

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 pb-6 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          <Text
            accessibilityRole="header"
            className="ds-text-screen-title text-ink"
          >
            {t("editProfile.title")}
          </Text>

          <View className="items-center">
            <ProfileAvatar name={currentName} onChangePhoto={showComingSoon} />
          </View>

          <View className="gap-1.5">
            <Text className="ds-text-section-label text-ink-2">
              {t("editProfile.nameLabel")}
            </Text>
            <TextInput
              icon={
                <Ionicons name="person-outline" size={20} color={theme.ink2} />
              }
              accessibilityLabel={t("editProfile.nameLabel")}
              autoComplete="name"
              returnKeyType="done"
              onSubmitEditing={submit}
              {...nameField}
            />
          </View>

          <View className="gap-1.5">
            <Text className="ds-text-section-label text-ink-2">
              {t("editProfile.emailLabel")}
            </Text>
            <TextInput
              icon={
                <Ionicons name="mail-outline" size={20} color={theme.ink2} />
              }
              accessibilityLabel={t("editProfile.emailLabel")}
              value={email}
              editable={false}
            />
            <Text className="ds-text-list-subtitle px-1 text-ink-2">
              {t("editProfile.emailHint")}
            </Text>
          </View>
        </ScrollView>

        <Button disabled={!canSubmit} loading={isSaving} onPress={submit}>
          {t("editProfile.save")}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}
