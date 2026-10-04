import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, textStyle, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'ink'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.lagoon }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 14,
    lineHeight: 20,
  },
  default: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  title: textStyle('screenTitle'),
  subtitle: textStyle('sheetTitle'),
  link: {
    fontFamily: 'Nunito_700Bold',
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: 'Nunito_700Bold',
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
