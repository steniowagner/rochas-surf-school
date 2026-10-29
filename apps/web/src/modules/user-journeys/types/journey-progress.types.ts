/** A row's result: unset rows are "not tested". */
export type JourneyResult = "approved" | "denied";

/** What a tester entered on one flow page (D-16): their name, each row's result and note. */
export type JourneyProgress = {
  name: string;
  results: Partial<Record<string, JourneyResult>>;
  notes: Partial<Record<string, string>>;
};

export type JourneyCounts = { approved: number; denied: number; notTested: number };
