import type { SessionUser } from "@/navigation/resolve-flow.types";

export type SaveWhatsappVariables = {
  // E.164, the country code included.
  whatsappNumber: string;
  whatsappVisible: boolean;
};

export type SaveWhatsappResponse = SessionUser;
