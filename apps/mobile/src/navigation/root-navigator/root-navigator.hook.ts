import { useSession } from "@/providers/session";

import { resolveFlow } from "../resolve-flow";

// Every approved account counts as onboarded until the onboarding spec supplies the real value (D-03).
const ONBOARDING_COMPLETED = true;

/** The flow of the account in the session: the only input of every route guard. */
export const useRootNavigator = () => {
  const { user } = useSession();

  return resolveFlow({ user, onboardingCompleted: ONBOARDING_COMPLETED });
};
