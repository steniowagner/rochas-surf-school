import { Toast } from "../toast";

import type { ScreenToastProps } from "./screen-toast.types";

/** The toast where the app shows it: over the top of the screen, under the status bar. */
export function ScreenToast(props: ScreenToastProps) {
  return (
    <div data-testid="screen-toast" className="absolute inset-x-5 top-3 z-30">
      <Toast {...props} />
    </div>
  );
}
