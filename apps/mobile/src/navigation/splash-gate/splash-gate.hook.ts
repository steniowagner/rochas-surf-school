import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useSession } from "@/providers/session";

import { UseSplashGateProps } from "./splash-gate.types";

/** The native splash screen stays up until the fonts are ready and the stored session was restored (spec 018, D-09). */
export const useSplashGate = ({ fontsReady }: UseSplashGateProps) => {
  const { isRestoring } = useSession();
  const isReady = fontsReady && !isRestoring;

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  return { isReady };
};
