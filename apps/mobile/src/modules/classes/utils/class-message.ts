import type { ClassDetails } from "../classes.types";

/** The people an admin's message to a class reaches, as the class details show them (spec 069, D-01, D-07). */
export type ClassMessageRecipients = {
  instructors: ClassDetails["instructors"];
  students: ClassDetails["students"];
  /** The requests still waiting for an answer: the class details carry only their number. */
  pendingCount: number;
  count: number;
};

/**
 * Who a message or a cancellation of the class reaches: its instructors and its students with a seat, each person
 * once and never the admin who sends it, plus the pending requests. Guests get nothing.
 */
export const classMessageRecipients = (
  item: Pick<ClassDetails, "instructors" | "students" | "pendingRequests">,
  senderId: string | undefined,
): ClassMessageRecipients => {
  const instructors = item.instructors.filter((instructor) => instructor.id !== senderId);
  const teaching = new Set(item.instructors.map((instructor) => instructor.id));
  const students = item.students.filter(
    (student) => student.id !== senderId && !teaching.has(student.id),
  );
  const pendingCount = item.pendingRequests ?? 0;

  return {
    instructors,
    students,
    pendingCount,
    count: instructors.length + students.length + pendingCount,
  };
};
