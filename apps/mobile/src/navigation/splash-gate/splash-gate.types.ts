import { ReactNode } from "react";

export type SplashGateProps = {
  // True once the design-system fonts loaded (or failed to).
  fontsReady: boolean;
  children: ReactNode;
};

export type UseSplashGateProps = Pick<SplashGateProps, "fontsReady">;
