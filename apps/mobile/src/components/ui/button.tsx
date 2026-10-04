import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { radii, shadowStyle, textStyle, touchTarget, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'dark' | 'outline' | 'subtle' | 'danger';

const variantColors: Record<ButtonVariant, { background?: ThemeColor; border?: ThemeColor; text: ThemeColor }> = {
  primary: { background: 'sun', text: 'onColor' },
  dark: { background: 'grape', text: 'onColor' },
  outline: { border: 'inputLine', text: 'ink' },
  subtle: { background: 'dim', text: 'ink2' },
  danger: { background: 'bad', text: 'onColor' },
};

export type ButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant;
  children: string;
};

export function Button({ variant = 'primary', children, style, ...props }: ButtonProps) {
  const theme = useTheme();
  const { background, border, text } = variantColors[variant];

  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [
        styles.button,
        background && {
          backgroundColor: variant === 'primary' && state.pressed ? theme.sun2 : theme[background],
        },
        border && { borderWidth: 1, borderColor: theme[border] },
        variant === 'primary' && shadowStyle('primary', theme),
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}>
      <Text style={[textStyle('button'), { color: theme[text] }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touchTarget,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
