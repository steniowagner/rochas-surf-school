import { ForbiddenError } from "@rochas-surf-school/shared";
import { UserRole, UserStatus } from "@rochas-surf-school/auth";
import {
  assertCanChangeSchoolRules,
  assertCanReadSchoolRules,
  SchoolRuleActor,
} from "../../../src";

const ID = "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34";

function actor(role: UserRole, status: UserStatus): SchoolRuleActor {
  return { id: ID, role, status };
}

describe("school rule access permission", () => {
  it.each<UserRole>(["student", "instructor", "admin"])(
    "lets an approved %s read the rules",
    (role) => {
      expect(() => assertCanReadSchoolRules(actor(role, "approved"))).not.toThrow();
    },
  );

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses to read to a %s account with user.status.notApproved",
    (status) => {
      expect(() => assertCanReadSchoolRules(actor("admin", status))).toThrow(
        expect.objectContaining({ message: "user.status.notApproved", statusCode: 403 }),
      );
    },
  );

  it("lets an approved admin change the rules", () => {
    expect(() => assertCanChangeSchoolRules(actor("admin", "approved"))).not.toThrow();
  });

  it.each<UserRole>(["student", "instructor"])(
    "refuses an approved %s with schoolRule.role.notAdmin",
    (role) => {
      const run = () => assertCanChangeSchoolRules(actor(role, "approved"));

      expect(run).toThrow(ForbiddenError);
      expect(run).toThrow(
        expect.objectContaining({ message: "schoolRule.role.notAdmin", statusCode: 403 }),
      );
    },
  );

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "checks the status before the role (%s student)",
    (status) => {
      expect(() => assertCanChangeSchoolRules(actor("student", status))).toThrow(
        expect.objectContaining({ message: "user.status.notApproved" }),
      );
    },
  );
});
