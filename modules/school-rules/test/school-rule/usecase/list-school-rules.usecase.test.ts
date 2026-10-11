import { UserRole, UserStatus } from "@rochas-surf-school/auth";
import { ListSchoolRules, SchoolRule } from "../../../src";
import { FakeSchoolRuleRepository } from "../../mock";

const ID = "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34";

function buildRule(title: string, index: number): SchoolRule {
  return new SchoolRule({
    title,
    description: `${title} description`,
    index,
    createdBy: ID,
  });
}

describe("ListSchoolRules", () => {
  it("answers version 0 and no rules when nothing was ever changed", async () => {
    const useCase = new ListSchoolRules(new FakeSchoolRuleRepository());

    await expect(
      useCase.execute({ actor: { id: ID, role: "student", status: "approved" } }),
    ).resolves.toEqual({ version: 0, rules: [] });
  });

  it.each<UserRole>(["student", "instructor", "admin"])(
    "lists the rules in order, with no extra field, to an approved %s",
    async (role) => {
      const second = buildRule("second", 2);
      const first = buildRule("first", 1);
      const useCase = new ListSchoolRules(
        new FakeSchoolRuleRepository([second, first], 7),
      );

      const out = await useCase.execute({
        actor: { id: ID, role, status: "approved" },
      });

      expect(out).toEqual({
        version: 7,
        rules: [
          { id: first.id, title: "first", description: "first description", index: 1 },
          { id: second.id, title: "second", description: "second description", index: 2 },
        ],
      });
    },
  );

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account with user.status.notApproved (permission)",
    async (status) => {
      const useCase = new ListSchoolRules(new FakeSchoolRuleRepository([buildRule("a", 1)]));

      await expect(
        useCase.execute({ actor: { id: ID, role: "admin", status } }),
      ).rejects.toMatchObject({ message: "user.status.notApproved", statusCode: 403 });
    },
  );
});
