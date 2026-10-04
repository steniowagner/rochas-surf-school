import { StyleSheet, Text, View } from 'react-native';

import { radii, textStyle, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChipTone = 'surf' | 'skate' | 'info' | 'sun' | 'grape' | 'warn' | 'ok' | 'bad' | 'muted' | 'onHighlight';

// Solid colour for the discipline (surf/skate), light tint for level and status.
const toneColors: Record<Exclude<ChipTone, 'onHighlight'>, { background: ThemeColor; text: ThemeColor }> = {
  surf: { background: 'lagoon', text: 'onColor' },
  skate: { background: 'tan', text: 'onColor' },
  info: { background: 'infoTint', text: 'lagoon' },
  sun: { background: 'sun', text: 'onColor' },
  grape: { background: 'grape', text: 'onColor' },
  warn: { background: 'warnTint', text: 'ink' },
  ok: { background: 'okTint', text: 'ok' },
  bad: { background: 'badTint', text: 'bad' },
  muted: { background: 'dim', text: 'ink2' },
};

export type ChipProps = {
  tone?: ChipTone;
  children: string;
};

export function Chip({ tone = 'info', children }: ChipProps) {
  const theme = useTheme();
  // On the grape "next lesson" card.
  const colors =
    tone === 'onHighlight'
      ? { backgroundColor: 'rgba(255,255,255,.18)', color: theme.onColor }
      : { backgroundColor: theme[toneColors[tone].background], color: theme[toneColors[tone].text] };

  return (
    <View style={[styles.chip, { backgroundColor: colors.backgroundColor }]}>
      <Text style={[textStyle('chip'), { color: colors.color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
});
