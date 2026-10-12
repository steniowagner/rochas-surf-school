import { ForbiddenError } from "@rochas-surf-school/shared";
import { UserRole, UserStatus } from "../model";

export interface RegistrationActor {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export function assertCanDecideRegistrations(actor: RegistrationActor): void {
  if (actor.status !== "approved") {
    throw new ForbiddenError("user.status.notApproved");
  }

  if (actor.role !== "admin") {
    throw new ForbiddenError("user.role.notAdmin");
  }
}
