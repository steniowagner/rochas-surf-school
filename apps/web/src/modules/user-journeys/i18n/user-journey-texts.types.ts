import type { RowId, UserJourneyFlowSlug, UserJourneyGroupKey } from "../data/user-journey-flows";

/** The texts of one test case. */
export type UserJourneyRowTexts = {
  title: string;
  beforeYouStart: string;
  steps: string;
  expected: string;
};

/** The texts of one flow: its title, description, the account to use and a title per group. */
export type UserJourneyFlowTexts<F extends UserJourneyFlowSlug> = {
  title: string;
  description: string;
  account: string;
  groups: Record<UserJourneyGroupKey<F>, string>;
};

/** Every text of the user journey pages in one language (D-13): a missing flow, group or row is a type error. */
export type UserJourneyTexts = {
  flows: { [F in UserJourneyFlowSlug]: UserJourneyFlowTexts<F> };
  rows: Record<RowId, UserJourneyRowTexts>;
};
