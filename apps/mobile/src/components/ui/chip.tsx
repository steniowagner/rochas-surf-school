import { Text, View } from "react-native";

export type ChipTone =
  | "surf"
  | "skate"
  | "info"
  | "sun"
  | "grape"
  | "warn"
  | "ok"
  | "bad"
  | "muted"
  | "onHighlight";

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

export type ChipProps = {
  tone?: ChipTone;
  children: string;
};

export function Chip({ tone = "info", children }: ChipProps) {
  const { container, label } = toneClasses[tone];

  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${container}`}
    >
      <Text className={`ds-text-chip ${label}`}>{children}</Text>
    </View>
  );
}
