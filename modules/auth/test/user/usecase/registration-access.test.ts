import { ForbiddenError } from "@rochas-surf-school/shared";
import {
  assertCanDecideRegistrations,
  USER_ROLES,
  USER_STATUSES,
  UserRole,
  UserStatus,
} from "../../../src";

function actor(role: UserRole, status: UserStatus) {
  return { id: "admin-id", role, status };
}

describe("assertCanDecideRegistrations", () => {
  test("lets an approved admin through", () => {
    expect(() =>
      assertCanDecideRegistrations(actor("admin", "approved")),
    ).not.toThrow();
  });

  test.each(USER_STATUSES.filter((status) => status !== "approved"))(
    "refuses an admin whose status is %s",
    (status) => {
      expect(() =>
        assertCanDecideRegistrations(actor("admin", status)),
      ).toThrow(new ForbiddenError("user.status.notApproved"));
    },
  );

  test.each(USER_ROLES.filter((role) => role !== "admin"))(
    "refuses an approved %s",
    (role) => {
      expect(() =>
        assertCanDecideRegistrations(actor(role, "approved")),
      ).toThrow(new ForbiddenError("user.role.notAdmin"));
    },
  );

  test("checks the status before the role", () => {
    expect(() =>
      assertCanDecideRegistrations(actor("student", "removed")),
    ).toThrow(new ForbiddenError("user.status.notApproved"));
  });
});
