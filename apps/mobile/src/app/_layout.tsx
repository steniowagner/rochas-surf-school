import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FontAssets } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Keep the native splash screen up until the design-system fonts are ready.
  const [fontsLoaded, fontError] = useFonts(FontAssets);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      {/* Tab screens live in the (tabs) group; full-screen routes go beside it. */}
      <Stack screenOptions={{ headerShown: false }} />
      <AnimatedSplashOverlay />
    </ThemeProvider>
  );
}
