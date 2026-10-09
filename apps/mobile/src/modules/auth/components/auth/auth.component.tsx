import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BUTTON_ACTIVE_OPACITY } from "@/components/ui/button";
import { TextButton } from "@/components/ui/text-button";
import { routes } from "@/constants/routes";
import { Colors } from "@/constants/theme";
import { themeVariables } from "@/constants/theme-variables";
import {
  localeAcronyms,
  localeFlags,
  localeNames,
  type AppLocale,
} from "@/i18n/locales";

import { AuthButton } from "../auth-button";
import { LanguageSheet } from "../language-sheet";
import { AuthComponentProps } from "./auth.types";

// The sign-in screen has the same look in light and dark, so it always uses the light palette.
const palette = Colors.light;

// The brand name is not translated.
const WORDMARK = [
  { line: "Rocha's", isAccent: false },
  { line: "Surf", isAccent: true },
  { line: "School", isAccent: false },
];

const TEAM_PHOTO = require("@/assets/images/team-hero.jpg");

// Google's multicolor "G": its colors are the brand's, so they don't come from the design tokens.
const GOOGLE_LOGO = require("@/assets/images/google-logo.svg");

// The photo is shown in grayscale, tinted grape, and fades to grape at the bottom so the buttons stay legible.
const PHOTO_FILTER = [{ grayscale: 1 }, { contrast: 1.1 }];
const GRAPE_FADE = `linear-gradient(to bottom, ${palette.grape}00 45%, ${palette.grape}E6 100%)`;

export function AuthComponent({
  onTermsPress,
  onPrivacyPress,
}: AuthComponentProps) {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();

  const currentLocale = i18n.language as AppLocale;
  const topInset = insets.top + 12;

  return (
    <View
      className="flex-1 overflow-hidden bg-grape"
      style={themeVariables.light}
    >
      <View className="absolute inset-0" style={{ filter: PHOTO_FILTER }}>
        <Image
          source={TEAM_PHOTO}
          contentFit="cover"
          style={{ width: "100%", height: "100%" }}
        />
      </View>
      <View
        className="absolute inset-0 bg-grape opacity-85"
        style={{ mixBlendMode: "multiply" }}
      />
      <View
        className="absolute inset-0"
        style={{ experimental_backgroundImage: GRAPE_FADE }}
      />

      <View
        className="absolute left-6 right-[18px] z-10 flex-row items-center justify-between"
        style={{ top: topInset }}
      >
        <View className="h-11 w-11 items-center justify-center rounded-control bg-sun">
          <MaterialCommunityIcons
            name="waves"
            size={23}
            color={palette.onColor}
          />
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${t("language.button")}: ${localeNames[currentLocale]}`}
          activeOpacity={BUTTON_ACTIVE_OPACITY}
          onPress={() => setIsLanguageOpen(true)}
          className="h-[38px] flex-row items-center gap-[7px] rounded-full border-[1.5px] border-white/55 pl-1.5 pr-3"
        >
          <Text className="w-6 text-center text-base">
            {localeFlags[currentLocale]}
          </Text>
          <Text className="ds-text-button text-on-color">
            {localeAcronyms[currentLocale]}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        className="absolute left-[22px] right-[22px]"
        style={{ top: topInset + 70 }}
      >
        {WORDMARK.map(({ line, isAccent }) => (
          <Text
            key={line}
            // The token's 0.84 line height (87px) is shorter than the glyphs, and React Native clips text to its
            // line box (CSS doesn't). So each line gets a 125px box (1.2 × 104px) and the extra 38px is pulled
            // back with negative margins, which keeps the design's 87px line spacing.
            className={`ds-text-wordmark leading-[125px] -my-[19px] ${isAccent ? "text-sun" : "text-on-color"}`}
          >
            {line}
          </Text>
        ))}
      </View>

      <View
        className="absolute left-[22px] right-[22px] gap-2.5"
        style={{ bottom: Math.max(insets.bottom, 30) }}
      >
        {Platform.OS === "ios" ? (
          <AuthButton
            variant="light"
            label={t("auth.continueWithApple")}
            icon={<Ionicons name="logo-apple" size={20} color={palette.ink} />}
          />
        ) : null}
        <AuthButton
          variant="light"
          label={t("auth.continueWithGoogle")}
          icon={
            <Image
              source={GOOGLE_LOGO}
              contentFit="contain"
              style={{ width: 18, height: 18 }}
            />
          }
        />
        <AuthButton
          variant="primary"
          label={t("auth.continueWithEmail")}
          onPress={() => router.push(routes.auth.createAccount)}
          icon={
            <Ionicons name="mail-outline" size={20} color={palette.onColor} />
          }
        />

        <Text className="ds-text-list-subtitle mx-2 mt-1.5 text-center text-white/90">
          {/* `t` makes the element depend on the language: Trans doesn't re-render on language changes by itself, and the React Compiler would otherwise cache it. */}
          <Trans
            i18nKey="auth.terms"
            t={t}
            components={{
              terms: <TextButton onPress={onTermsPress} />,
              privacy: <TextButton onPress={onPrivacyPress} />,
            }}
          />
        </Text>
      </View>

      <LanguageSheet
        visible={isLanguageOpen}
        onClose={() => setIsLanguageOpen(false)}
      />
    </View>
  );
}
