import { router, useLocalSearchParams } from "expo-router";

import { routes } from "@/constants/routes";

import { CreateAccount } from "../components/create-account";
import { CodeRequest } from "../components/create-account/create-account.types";
import { useLegalPages } from "../hooks/use-legal-pages.hook";

const openConfirmCode = ({ email, name }: CodeRequest) =>
  router.push(routes.auth.confirmCode({ email, name }));

export function CreateAccountScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const legalPages = useLegalPages();

  return (
    <CreateAccount
      {...legalPages}
      initialEmail={email}
      onCodeRequested={openConfirmCode}
    />
  );
}
