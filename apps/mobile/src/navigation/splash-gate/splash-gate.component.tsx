import { useSplashGate } from "./splash-gate.hook";
import { SplashGateProps } from "./splash-gate.types";

export function SplashGate({ fontsReady, children }: SplashGateProps) {
  const { isReady } = useSplashGate({ fontsReady });

  return isReady ? children : null;
}
