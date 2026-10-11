import type { SessionUser } from "@/navigation/resolve-flow.types";

export type AcceptSchoolRulesVariables = {
  // The version the person saw, as `GET /school-rules` returned it.
  version: number;
};

export type AcceptSchoolRulesResponse = SessionUser;

export type UseAcceptSchoolRulesProps = {
  /** Called when the accepted version is no longer the current one (409), after the rules were requested again. */
  onOutdated?: () => void;
};
