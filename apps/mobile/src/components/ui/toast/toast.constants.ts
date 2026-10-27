import { ToastTone } from "./toast.types";

export const toneStyles: Record<
  ToastTone,
  {
    background: string;
    icon: "alert-circle-outline" | "checkmark-circle-outline";
  }
> = {
  success: { background: "bg-ok", icon: "checkmark-circle-outline" },
  error: { background: "bg-bad", icon: "alert-circle-outline" },
};
