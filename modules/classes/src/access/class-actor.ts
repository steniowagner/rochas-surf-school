import { ForbiddenError } from "@rochas-surf-school/shared";
import { UserRole, UserStatus } from "@rochas-surf-school/auth";

export interface ClassActor {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export function assertCanReadClasses(actor: ClassActor): void {
  if (actor.status !== "approved") {
    throw new ForbiddenError("user.status.notApproved");
  }
}

export function assertCanManageClasses(actor: ClassActor): void {
  assertCanReadClasses(actor);

  if (actor.role !== "admin") {
    throw new ForbiddenError("user.role.notAdmin");
  }
}
