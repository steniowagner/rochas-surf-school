import { UserRole, UserStatus } from "@rochas-surf-school/auth";

export interface TeacherRef {
  id: string;
  role: UserRole;
  status: UserStatus;
  /** Meaningful only for admins: an admin with it set can be assigned to teach. */
  isInstructor: boolean;
}

export interface TeacherLookup {
  /** The users that exist among `ids`; the others are left out. */
  findTeachers(ids: string[]): Promise<TeacherRef[]>;
}

/** Who can be assigned to a class: an approved instructor, or an approved admin who also teaches. */
export function canTeach(teacher: TeacherRef): boolean {
  if (teacher.status !== "approved") return false;

  return teacher.role === "instructor" || (teacher.role === "admin" && teacher.isInstructor);
}
