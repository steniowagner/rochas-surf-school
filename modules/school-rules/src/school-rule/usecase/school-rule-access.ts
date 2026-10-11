import { ForbiddenError } from "@rochas-surf-school/shared";
import { UserRole, UserStatus } from "@rochas-surf-school/auth";

export interface SchoolRuleActor {
  id: string;
  role: UserRole;
  status: UserStatus;
}

export function assertCanReadSchoolRules(actor: SchoolRuleActor): void {
  if (actor.status !== "approved") {
    throw new ForbiddenError("user.status.notApproved");
  }
}

export function assertCanChangeSchoolRules(actor: SchoolRuleActor): void {
  assertCanReadSchoolRules(actor);

  if (actor.role !== "admin") {
    throw new ForbiddenError("schoolRule.role.notAdmin");
  }
}
