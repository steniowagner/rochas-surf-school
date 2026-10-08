import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "@/global.css";
import { FontAssets } from "@/constants/theme";
import { themeVariables } from "@/constants/theme-variables";
// Initializes i18n before any screen renders, so the first frame is already translated.
import "@/i18n";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Keep the native splash screen up until the design-system fonts are ready.
  const [fontsLoaded, fontError] = useFonts(FontAssets);
  const isReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  const scheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Sets the --ds-* variables behind the NativeWind color utilities for the OS color scheme. */}
      <View className="flex-1" style={themeVariables[scheme]}>
        <BottomSheetModalProvider>
          <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
            <StatusBar style="auto" />
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </BottomSheetModalProvider>
      </View>
    </GestureHandlerRootView>
  );
}
