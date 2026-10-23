export type SchoolRulesEntryRowRole = "admin" | "instructor";

export type SchoolRulesEntryRowProps = {
  /** Picks the subtitle: admins manage the rules, instructors read them. */
  role: SchoolRulesEntryRowRole;
  onPress: () => void;
};

export type UseSchoolRulesEntryRowProps = Pick<SchoolRulesEntryRowProps, "role">;
