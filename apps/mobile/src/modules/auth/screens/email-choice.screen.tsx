import { router } from "expo-router";

import { routes } from "@/constants/routes";

import { EmailChoice } from "../components/email-choice";
import { useLegalPages } from "../hooks/use-legal-pages.hook";

const openSignIn = () => router.push(routes.auth.emailSignIn);
const openCreateAccount = () => router.push(routes.auth.createAccount());

export function EmailChoiceScreen() {
  const legalPages = useLegalPages();

  return (
    <EmailChoice
      {...legalPages}
      onHaveAccountPress={openSignIn}
      onNewPress={openCreateAccount}
    />
  );
}
