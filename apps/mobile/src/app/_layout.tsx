import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import "@/global.css";
import { FontAssets } from "@/constants/theme";
import { themeVariables } from "@/constants/theme-variables";
import { RootNavigator } from "@/navigation/root-navigator";
import { SplashGate } from "@/navigation/splash-gate";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";
// Initializes i18n before any screen renders, so the first frame is already translated.
import "@/i18n";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // The native splash screen stays up until the design-system fonts are ready and the stored session was restored (SplashGate).
  const [fontsLoaded, fontError] = useFonts(FontAssets);
  const fontsReady = fontsLoaded || !!fontError;

  const scheme = colorScheme === "dark" ? "dark" : "light";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Sets the --ds-* variables behind the NativeWind color utilities for the OS color scheme. */}
      <View className="flex-1" style={themeVariables[scheme]}>
        <BottomSheetModalProvider>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
              <AlertMessageProvider>
                <SessionProvider>
                  <SplashGate fontsReady={fontsReady}>
                    <StatusBar style="auto" />
                    <RootNavigator />
                  </SplashGate>
                </SessionProvider>
              </AlertMessageProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </BottomSheetModalProvider>
      </View>
    </GestureHandlerRootView>
  );
}
