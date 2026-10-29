import type { Dictionary } from "@/i18n/dictionary.types";

export type CopyEmailButtonProps = {
  email: string;
  labels: Pick<Dictionary["userJourneys"]["testAccounts"], "copyEmail" | "copied" | "copyFailed">;
};

export type UseCopyEmailButtonProps = Pick<CopyEmailButtonProps, "email">;
