import { router } from "expo-router";

import { routes } from "@/constants/routes";

import { EmailSignIn } from "../components/email-sign-in";

const openConfirmCode = (email: string) =>
  router.push(routes.auth.confirmCode({ email }));

// The design keeps Sign in with email out of the stack, so Back from Create account returns to Choose.
const openCreateAccount = (email: string) =>
  router.replace(routes.auth.createAccount(email ? { email } : undefined));

export function EmailSignInScreen() {
  return (
    <EmailSignIn
      onCodeRequested={openConfirmCode}
      onCreateAccountPress={openCreateAccount}
    />
  );
}
