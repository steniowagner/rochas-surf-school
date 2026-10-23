export type TeachingClassesEntryRowRole = "admin" | "instructor";

export type TeachingClassesEntryRowProps = {
  /** Instructors always see the row; admins only once they teach a class. */
  role: TeachingClassesEntryRowRole;
  onPress: () => void;
};

export type UseTeachingClassesEntryRowProps = Pick<TeachingClassesEntryRowProps, "role">;

export type UseTeachingClassesEntryRowResult = {
  visible: boolean;
  /** How many classes are assigned, or `null` while loading and after an error. */
  subtitle: string | null;
};
