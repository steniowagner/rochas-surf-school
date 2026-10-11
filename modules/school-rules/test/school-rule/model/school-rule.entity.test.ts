import { ValidationException } from "@rochas-surf-school/shared";
import { SchoolRule, SchoolRuleState } from "../../../src";

const ADMIN_ID = "0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34";

function buildState(overrides: Partial<SchoolRuleState> = {}): SchoolRuleState {
  return {
    title: "Chega 15 min antes",
    description: "Tempo para vestir o fato.",
    index: 1,
    ...overrides,
  };
}

function validationMessagesFor(overrides: Partial<SchoolRuleState>): string[] {
  const rule = new SchoolRule(buildState(overrides));
  try {
    rule.validate();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

describe("SchoolRule", () => {
  it("creates a valid rule and exposes every field", () => {
    const rule = new SchoolRule(buildState({ createdBy: ADMIN_ID }));

    expect(rule.id).toEqual(expect.any(String));
    expect(rule.title).toBe("Chega 15 min antes");
    expect(rule.description).toBe("Tempo para vestir o fato.");
    expect(rule.index).toBe(1);
    expect(rule.createdBy).toBe(ADMIN_ID);
    expect(() => rule.validate()).not.toThrow();
  });

  it("accepts a rule without a creator", () => {
    const rule = new SchoolRule(buildState());

    expect(rule.createdBy).toBeUndefined();
    expect(() => rule.validate()).not.toThrow();
  });

  it("accepts a title of 60 characters and a description of 300", () => {
    expect(
      validationMessagesFor({
        title: "a".repeat(60),
        description: "b".repeat(300),
      }),
    ).toEqual([]);
  });

  it("refuses a title of 61 characters", () => {
    expect(validationMessagesFor({ title: "a".repeat(61) })).toEqual([
      "schoolRule.title.max.length",
    ]);
  });

  it("refuses a description of 301 characters", () => {
    expect(validationMessagesFor({ description: "b".repeat(301) })).toEqual([
      "schoolRule.description.max.length",
    ]);
  });

  it.each(["", "   ", undefined])("requires a title (%p)", (title) => {
    expect(validationMessagesFor({ title: title as never })).toEqual([
      "schoolRule.title.required",
    ]);
  });

  it.each(["", "   ", undefined])("requires a description (%p)", (description) => {
    expect(
      validationMessagesFor({ description: description as never }),
    ).toEqual(["schoolRule.description.required"]);
  });

  it("lists both keys when title and description are invalid", () => {
    expect(validationMessagesFor({ title: "", description: "" })).toEqual([
      "schoolRule.title.required",
      "schoolRule.description.required",
    ]);
  });

  it.each([0, -1])("refuses an index of %p", (index) => {
    expect(validationMessagesFor({ index })).toEqual([
      "schoolRule.index.positive",
    ]);
  });

  it("refuses an index that is not an integer", () => {
    expect(validationMessagesFor({ index: 1.5 })).toEqual([
      "schoolRule.index.integer",
    ]);
  });

  it("refuses a creator that is not a UUID", () => {
    expect(validationMessagesFor({ createdBy: "admin" })).toEqual([
      "schoolRule.createdBy.uuid",
    ]);
  });
});
