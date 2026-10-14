import { ForbiddenError } from "@rochas-surf-school/shared";
import { assertCanManageClasses, assertCanReadClasses } from "../../src";
import { ADMIN, INSTRUCTOR, STUDENT } from "../mock";

describe("class access", () => {
  it("lets any approved account read", () => {
    for (const actor of [ADMIN, INSTRUCTOR, STUDENT]) {
      expect(() => assertCanReadClasses(actor)).not.toThrow();
    }
  });

  it("refuses reading when the account is not approved", () => {
    expect(() => assertCanReadClasses({ ...ADMIN, status: "pending" })).toThrow(
      new ForbiddenError("user.status.notApproved"),
    );
  });

  it("lets only an approved admin manage", () => {
    expect(() => assertCanManageClasses(ADMIN)).not.toThrow();
    expect(() => assertCanManageClasses(INSTRUCTOR)).toThrow(
      new ForbiddenError("user.role.notAdmin"),
    );
    expect(() => assertCanManageClasses({ ...ADMIN, status: "removed" })).toThrow(
      new ForbiddenError("user.status.notApproved"),
    );
  });
});
