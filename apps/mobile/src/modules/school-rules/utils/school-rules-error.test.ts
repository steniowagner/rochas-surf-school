import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import { getSchoolRuleErrorKey, isRuleNotFoundError } from "./school-rules-error";

const api = (status: number, key: string) => new ApiError(status, [key]);

describe("getSchoolRuleErrorKey", () => {
  it.each([
    [404, "schoolRule.id.notFound", "manageSchoolRules.toasts.notFound"],
    [404, "other.notFound", "createAccount.errors.generic"],
    [422, "schoolRule.title.required", "createAccount.errors.generic"],
    [403, "schoolRule.role.notAdmin", "createAccount.errors.generic"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getSchoolRuleErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy, an expired session to nothing and the rest to the generic copy", () => {
    expect(getSchoolRuleErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getSchoolRuleErrorKey(new SessionExpiredError())).toBeNull();
    expect(getSchoolRuleErrorKey(new Error("boom"))).toBe("createAccount.errors.generic");
  });
});

describe("isRuleNotFoundError", () => {
  it("tells a missing rule by status and key", () => {
    expect(isRuleNotFoundError(api(404, "schoolRule.id.notFound"))).toBe(true);
    expect(isRuleNotFoundError(api(422, "schoolRule.id.notFound"))).toBe(false);
    expect(isRuleNotFoundError(new NetworkError())).toBe(false);
  });
});
