import { UserRole, UserStatus } from "@rochas-surf-school/auth";

export interface TeacherRef {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export interface TeacherLookup {
  /** The users that exist among `ids`; the others are left out. */
  findTeachers(ids: string[]): Promise<TeacherRef[]>;
}
