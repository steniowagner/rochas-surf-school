/** The list an erased person is shown in: the label follows the list, whatever their role (spec 067, D-07). */
export type PersonList = "student" | "instructor";

const ERASED_KEYS: Record<PersonList, string> = {
  student: "classes.erased.student",
  instructor: "classes.erased.instructor",
};

/** The person's name, or "Former student" / "Former instructor" when their account was erased (`name` is `null`). */
export const personLabel = (
  name: string | null,
  list: PersonList,
  t: (key: string) => string,
): string => name ?? t(ERASED_KEYS[list]);
