import { useSession } from "@/providers/session";

import { resolveFlow } from "../resolve-flow";

// Onboarding is never completed until the school-rules spec computes it (spec 008, D-01): an approved
// account always lands on an onboarding step and the role homes stay unreachable.
const ONBOARDING_COMPLETED = false;

/** The flow of the account in the session: the only input of every route guard. */
export const useRootNavigator = () => {
  const { user } = useSession();

  return resolveFlow({ user, onboardingCompleted: ONBOARDING_COMPLETED });
};
