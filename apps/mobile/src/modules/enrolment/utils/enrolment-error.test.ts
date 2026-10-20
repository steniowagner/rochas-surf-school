import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import {
  getDecideRequestErrorKey,
  getRequestSeatErrorKey,
  getWithdrawRequestErrorKey,
  isAlreadyOpenError,
  isNotPendingError,
  isRuleNotAcceptedError,
  shouldReloadClass,
  shouldReloadRequests,
} from "./enrolment-error";

const api = (status: number, key: string) => new ApiError(status, [key]);

describe("getRequestSeatErrorKey", () => {
  it.each([
    [409, "class.started", "enrolment.errors.started"],
    [409, "class.cancelled", "enrolment.errors.cancelled"],
    [409, "enrolment.alreadyOpen", "enrolment.errors.alreadyOpen"],
    [422, "enrolment.rule.notAccepted", "enrolment.errors.ruleNotAccepted"],
    [404, "class.notFound", "classDetails.notFound"],
    [403, "enrolment.role.notStudent", "createAccount.errors.generic"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getRequestSeatErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy, an expired session to nothing and the rest to the generic copy", () => {
    expect(getRequestSeatErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getRequestSeatErrorKey(new SessionExpiredError())).toBeNull();
    expect(getRequestSeatErrorKey(new Error("boom"))).toBe("createAccount.errors.generic");
  });
});

describe("getWithdrawRequestErrorKey", () => {
  it.each([
    [409, "enrolment.notPending", "enrolment.errors.notPending"],
    [409, "class.started", "enrolment.errors.started"],
    [404, "enrolment.notFound", "enrolment.errors.notFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getWithdrawRequestErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getWithdrawRequestErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getWithdrawRequestErrorKey(new SessionExpiredError())).toBeNull();
  });
});

describe("the predicates", () => {
  it("tells each failure by status and key", () => {
    expect(isRuleNotAcceptedError(api(422, "enrolment.rule.notAccepted"))).toBe(true);
    expect(isRuleNotAcceptedError(api(409, "enrolment.rule.notAccepted"))).toBe(false);
    expect(isAlreadyOpenError(api(409, "enrolment.alreadyOpen"))).toBe(true);
    expect(isNotPendingError(api(409, "enrolment.notPending"))).toBe(true);
    expect(isNotPendingError(new Error("x"))).toBe(false);
  });

  it.each([
    ["class.started", true],
    ["class.cancelled", true],
    ["enrolment.alreadyOpen", true],
    ["enrolment.notPending", true],
    ["enrolment.rule.notAccepted", false],
  ])("asks to reload the class for %s: %s", (key, expected) => {
    expect(shouldReloadClass(api(key === "enrolment.rule.notAccepted" ? 422 : 409, key))).toBe(expected);
  });

  it("does not reload for a network failure", () => {
    expect(shouldReloadClass(new NetworkError())).toBe(false);
  });
});

describe("getDecideRequestErrorKey and shouldReloadRequests", () => {
  it.each([
    [409, "enrolment.notPending", "classRequests.errors.notPending"],
    [409, "class.started", "classRequests.errors.started"],
    [409, "enrolment.class.full", "classRequests.errors.full"],
    [404, "enrolment.notFound", "enrolment.errors.notFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getDecideRequestErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getDecideRequestErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getDecideRequestErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("reloads the list only when it turned out to be stale", () => {
    expect(shouldReloadRequests(api(409, "enrolment.notPending"))).toBe(true);
    expect(shouldReloadRequests(api(409, "class.started"))).toBe(true);
    expect(shouldReloadRequests(api(409, "enrolment.class.full"))).toBe(true);
    expect(shouldReloadRequests(api(404, "enrolment.notFound"))).toBe(false);
    expect(shouldReloadRequests(new NetworkError())).toBe(false);
  });
});
