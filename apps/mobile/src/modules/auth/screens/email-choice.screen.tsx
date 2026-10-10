import { router } from "expo-router";

import { routes } from "@/constants/routes";

import { EmailChoice } from "../components/email-choice";

const openSignIn = () => router.push(routes.auth.emailSignIn);
const openCreateAccount = () => router.push(routes.auth.createAccount());

export function EmailChoiceScreen() {
  return (
    <EmailChoice
      onHaveAccountPress={openSignIn}
      onNewPress={openCreateAccount}
    />
  );
}
