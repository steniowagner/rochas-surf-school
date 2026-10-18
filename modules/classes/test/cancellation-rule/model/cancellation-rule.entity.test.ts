import { ValidationException } from "@rochas-surf-school/shared";
import { CANCELLATION_RULE_TEXT_MAX, CancellationRule } from "../../../src";
import { ADMIN, buildCancellationRule } from "../../mock";

function keysOf(rule: CancellationRule): string[] {
  try {
    rule.validate();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

describe("CancellationRule", () => {
  it("keeps the text trimmed, otherwise as written", () => {
    const rule = buildCancellationRule({ text: "  Até 6 horas\nantes.  " });

    expect(rule.text).toBe("Até 6 horas\nantes.");
    expect(rule.discipline).toBe("surf");
    expect(rule.updatedBy).toBe(ADMIN.id);
    expect(keysOf(rule)).toEqual([]);
  });

  it("accepts 2000 characters and refuses 2001", () => {
    expect(keysOf(buildCancellationRule({ text: "a".repeat(CANCELLATION_RULE_TEXT_MAX) }))).toEqual([]);
    expect(keysOf(buildCancellationRule({ text: "a".repeat(CANCELLATION_RULE_TEXT_MAX + 1) }))).toEqual([
      "cancellationRule.text.max.length",
    ]);
  });

  it("refuses a blank text", () => {
    expect(keysOf(buildCancellationRule({ text: "   " }))).toEqual(["cancellationRule.text.required"]);
  });

  it("refuses an unknown discipline and a bad author", () => {
    const rule = buildCancellationRule({
      discipline: "kitesurf" as never,
      updatedBy: "nobody",
    });

    expect(keysOf(rule)).toEqual([
      "cancellationRule.discipline.in",
      "cancellationRule.updatedBy.uuid",
    ]);
  });
});
