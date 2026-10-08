import { router } from "expo-router";

import { CreateAccount } from "../components/create-account";
import { CodeRequest } from "../components/create-account/create-account.types";

const openConfirmCode = ({ email, name }: CodeRequest) =>
  router.push({ pathname: "/auth/confirm-code", params: { email, name } });

export function CreateAccountScreen() {
  return <CreateAccount onCodeRequested={openConfirmCode} />;
}
