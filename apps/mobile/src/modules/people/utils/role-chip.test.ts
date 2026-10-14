import { roleChip } from "./role-chip";

describe("roleChip", () => {
  it("maps each role to its tone and its profile label", () => {
    expect(roleChip).toEqual({
      student: { tone: "muted", labelKey: "profile.role.student" },
      instructor: { tone: "info", labelKey: "profile.role.instructor" },
      admin: { tone: "grape", labelKey: "profile.role.admin" },
    });
  });
});
