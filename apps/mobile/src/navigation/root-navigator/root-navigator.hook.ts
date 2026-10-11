import { useSession } from "@/providers/session";

import { isOnboardingCompleted, resolveFlow } from "../resolve-flow";

/** The flow of the account in the session: the only input of every route guard. */
export const useRootNavigator = () => {
  const { user } = useSession();

  return resolveFlow({
    user,
    onboardingCompleted: isOnboardingCompleted(user),
  });
};
