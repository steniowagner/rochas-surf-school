import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

import type { ThemeColor } from "@/constants/theme";

import { ChipProps, ChipTone } from "./chip.types";

// Same classes as the web Chip (apps/web/src/components/ui/chip.tsx).
// Solid colour for the discipline (surf/skate), light tint for level and status.
const toneClasses: Record<ChipTone, { container: string; label: string }> = {
  surf: { container: "bg-lagoon", label: "text-on-color" },
  skate: { container: "bg-tan", label: "text-on-color" },
  info: { container: "bg-info-tint", label: "text-lagoon" },
  sun: { container: "bg-sun", label: "text-on-color" },
  grape: { container: "bg-grape", label: "text-on-color" },
  warn: { container: "bg-warn-tint", label: "text-ink" },
  ok: { container: "bg-ok-tint", label: "text-ok" },
  bad: { container: "bg-bad-tint", label: "text-bad" },
  muted: { container: "bg-dim", label: "text-ink-2" },
  // On the grape "next lesson" card.
  onHighlight: { container: "bg-white/[.18]", label: "text-on-color" },
};

// Icon colour, the same as the label's text colour.
const iconColors: Record<ChipTone, ThemeColor> = {
  surf: "onColor",
  skate: "onColor",
  info: "lagoon",
  sun: "onColor",
  grape: "onColor",
  warn: "ink",
  ok: "ok",
  bad: "bad",
  muted: "ink2",
  onHighlight: "onColor",
};

const ICON_SIZE = 12;

export function Chip({ tone = "info", icon, children }: ChipProps) {
  const theme = useTheme();
  const { container, label } = toneClasses[tone];

  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${container}`}
    >
      {icon ? (
        <Ionicons name={icon} size={ICON_SIZE} color={theme[iconColors[tone]]} />
      ) : null}
      <Text className={`ds-text-chip ${label}`}>{children}</Text>
    </View>
  );
}
