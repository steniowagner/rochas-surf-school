import { router } from "expo-router";

import type { WhatsappNumberValues } from "@/components/whatsapp-number-form/whatsapp-number-form.types";
import { useSaveWhatsapp } from "@/modules/onboarding/hooks/use-save-whatsapp.hook";
import { useSession } from "@/providers/session";

export const useProfileWhatsapp = () => {
  const { user } = useSession();
  const saveWhatsapp = useSaveWhatsapp();

  const submit = (values: WhatsappNumberValues) => {
    saveWhatsapp.mutate(values, { onSuccess: () => router.back() });
  };

  return {
    whatsappNumber: user?.whatsappNumber,
    whatsappVisible: user?.whatsappVisible,
    isSaving: saveWhatsapp.isPending,
    submit,
  };
};
