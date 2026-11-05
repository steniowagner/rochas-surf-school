import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import { BottomModal } from "@/components/ui/bottom-modal";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

import { ABOUT } from "../../constants/about";
import { useOpenUrl } from "../../hooks/use-open-url.hook";

import { AboutSheetProps } from "./about-sheet.types";

// The creator's photo, bundled at 3x of the 44 pt avatar so it works offline.
const CREATOR_PHOTO = require("@/assets/images/creator-avatar.jpg");

const LINKS = [
  {
    labelKey: "about.creatorInstagram",
    url: ABOUT.links.creatorInstagram,
    icon: "logo-instagram",
  },
  {
    labelKey: "about.creatorLinkedin",
    url: ABOUT.links.creatorLinkedin,
    icon: "logo-linkedin",
  },
] as const;

/** The About sheet (spec 026, D-13); its links open in the in-app browser. */
export function AboutSheet({ visible, onClose }: AboutSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const openUrl = useOpenUrl();

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <View className="mb-4 flex-row items-center gap-3.5">
        <View className="h-14 w-14 items-center justify-center rounded-card bg-sun">
          <MaterialCommunityIcons
            name="waves"
            size={30}
            color={theme.onColor}
          />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="ds-text-sheet-title text-ink">{ABOUT.appName}</Text>
          <Text className="ds-text-list-subtitle text-ink-2">
            {t("about.version", { version: ABOUT.version })}
          </Text>
        </View>
      </View>

      <Text className="ds-text-body mb-4 text-ink-2">
        {t("about.description")}
      </Text>

      <View className="mb-2 flex-row items-center gap-3 py-2">
        <View className="h-11 w-11 overflow-hidden rounded-full bg-sand">
          <Image
            testID="about-creator-photo"
            source={CREATOR_PHOTO}
            accessibilityLabel={ABOUT.creatorName}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
        <View className="flex-1">
          <Text className="ds-text-list-title text-ink">
            {ABOUT.creatorName}
          </Text>
          <Text className="ds-text-list-subtitle text-ink-2">
            {t("about.creatorRole")}
          </Text>
        </View>
      </View>

      {LINKS.map((link) => (
        <Pressable
          key={link.labelKey}
          accessibilityRole="button"
          accessibilityLabel={t(link.labelKey)}
          onPress={() => openUrl(link.url)}
          className="min-h-11 flex-row items-center gap-3 border-t border-line py-3"
        >
          <Ionicons name={link.icon} size={20} color={theme.lagoon} />
          <Text className="ds-text-list-title flex-1 text-ink">
            {t(link.labelKey)}
          </Text>
          <Ionicons name="open-outline" size={18} color={theme.ink3} />
        </Pressable>
      ))}

      <View className="mt-3">
        <Button variant="ghost" onPress={onClose}>
          {t("about.close")}
        </Button>
      </View>
    </BottomModal>
  );
}
