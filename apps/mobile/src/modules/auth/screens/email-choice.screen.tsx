import { routes } from "@/constants/routes";
import { pushScreen } from "@/navigation/push-screen";

import { EmailChoice } from "../components/email-choice";
import { useLegalPages } from "../hooks/use-legal-pages.hook";

const openSignIn = () => pushScreen(routes.auth.emailSignIn);
const openCreateAccount = () => pushScreen(routes.auth.createAccount());

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
