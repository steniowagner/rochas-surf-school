import { router } from "expo-router";

import { routes } from "@/constants/routes";
import type { WhatsappNumberValues } from "@/components/whatsapp-number-form/whatsapp-number-form.types";
import { useSession } from "@/providers/session";

import { useSaveWhatsapp } from "../../hooks/use-save-whatsapp.hook";

export const useWhatsapp = () => {
  const { user } = useSession();
  const saveWhatsapp = useSaveWhatsapp();

  const submit = (values: WhatsappNumberValues) => {
    saveWhatsapp.mutate(values, {
      // Replaced, so going back doesn't return to the WhatsApp step.
      onSuccess: () => router.replace(routes.onboarding.schoolRules),
    });
  };

  return {
    firstName: user?.name.trim().split(/\s+/)[0] ?? "",
    isSaving: saveWhatsapp.isPending,
    submit,
  };
};
