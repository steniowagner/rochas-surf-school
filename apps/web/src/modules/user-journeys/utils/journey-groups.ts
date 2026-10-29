import { userJourneyFlows, type JourneyDesignId, type UserJourneyFlowSlug } from "../data/user-journey-flows";
import type { UserJourneyRowTexts, UserJourneyTexts } from "../i18n/user-journey-texts.types";

/** A row as the board draws it: its id, its texts in the page's language and its design frames. */
export type JourneyBoardRow = UserJourneyRowTexts & { id: string; designIds: readonly JourneyDesignId[] };

export type JourneyBoardGroup = { key: string; title: string; rows: JourneyBoardRow[] };

/** A flow's groups and rows, in order, with the texts of one language. */
export const buildJourneyGroups = (flow: UserJourneyFlowSlug, texts: UserJourneyTexts): JourneyBoardGroup[] => {
  const groupTitles: Record<string, string> = texts.flows[flow].groups;
  const groups: readonly { key: string; rows: readonly { id: string; designIds: readonly JourneyDesignId[] }[] }[] =
    userJourneyFlows[flow].groups;

  return groups.map((group) => ({
    key: group.key,
    title: groupTitles[group.key],
    rows: group.rows.map((row) => ({
      id: row.id,
      designIds: row.designIds,
      ...texts.rows[row.id as keyof UserJourneyTexts["rows"]],
    })),
  }));
};
