import { router } from "expo-router";

import { routes } from "@/constants/routes";

import { CreateAccount } from "../components/create-account";
import { CodeRequest } from "../components/create-account/create-account.types";

const openConfirmCode = ({ email, name }: CodeRequest) =>
  router.push(routes.auth.confirmCode({ email, name }));

export function CreateAccountScreen() {
  return <CreateAccount onCodeRequested={openConfirmCode} />;
}
