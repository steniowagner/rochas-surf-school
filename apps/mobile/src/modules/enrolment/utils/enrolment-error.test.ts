import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import {
  getAddGuestErrorKey,
  getCancelSeatErrorKey,
  getDecideRequestErrorKey,
  getEnrolStudentErrorKey,
  getRemoveGuestErrorKey,
  getRequestSeatErrorKey,
  getTakeOutErrorKey,
  getWithdrawRequestErrorKey,
  isAlreadyOpenError,
  isDeadlineClosedError,
  isNotPendingError,
  isWaitingListClosedError,
  isRuleNotAcceptedError,
  shouldReloadAddGuestClasses,
  shouldReloadClass,
  shouldReloadEnrolClasses,
  shouldReloadRequests,
} from "./enrolment-error";

const api = (status: number, key: string) => new ApiError(status, [key]);

describe("getRequestSeatErrorKey", () => {
  it.each([
    [409, "class.started", "enrolment.errors.started"],
    [409, "class.cancelled", "enrolment.errors.cancelled"],
    [409, "enrolment.alreadyOpen", "enrolment.errors.alreadyOpen"],
    [409, "enrolment.waitingList.closed", "enrolment.errors.waitingListClosed"],
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

describe("getCancelSeatErrorKey", () => {
  it.each([
    [409, "enrolment.notApproved", "enrolment.errors.notApproved"],
    [409, "class.started", "enrolment.errors.started"],
    [404, "enrolment.notFound", "enrolment.errors.notFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getCancelSeatErrorKey(api(status, key))).toBe(expected);
  });

  it("shows nothing for a closed deadline: the note explains it", () => {
    expect(getCancelSeatErrorKey(api(409, "enrolment.deadline.passed"))).toBeNull();
    expect(getCancelSeatErrorKey(api(409, "enrolment.deadline.missing"))).toBeNull();
    expect(isDeadlineClosedError(api(409, "enrolment.deadline.passed"))).toBe(true);
    expect(isDeadlineClosedError(api(409, "enrolment.deadline.missing"))).toBe(true);
    expect(isDeadlineClosedError(api(409, "class.started"))).toBe(false);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getCancelSeatErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getCancelSeatErrorKey(new SessionExpiredError())).toBeNull();
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
    ["enrolment.notApproved", true],
    ["enrolment.deadline.passed", true],
    ["enrolment.deadline.missing", true],
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

describe("getEnrolStudentErrorKey and shouldReloadEnrolClasses", () => {
  it.each([
    [409, "enrolment.alreadyApproved", "enrolStudent.errors.alreadyApproved"],
    [409, "enrolment.class.full", "enrolStudent.errors.full"],
    [409, "class.started", "enrolStudent.errors.started"],
    [409, "class.cancelled", "enrolStudent.errors.cancelled"],
    [422, "enrolment.student.invalid", "enrolStudent.errors.invalidStudent"],
    [404, "class.notFound", "classDetails.notFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getEnrolStudentErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getEnrolStudentErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getEnrolStudentErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("reloads the classes only when they turned out to be stale", () => {
    expect(shouldReloadEnrolClasses(api(409, "enrolment.alreadyApproved"))).toBe(true);
    expect(shouldReloadEnrolClasses(api(409, "enrolment.class.full"))).toBe(true);
    expect(shouldReloadEnrolClasses(api(409, "class.started"))).toBe(true);
    expect(shouldReloadEnrolClasses(api(409, "class.cancelled"))).toBe(true);
    expect(shouldReloadEnrolClasses(api(422, "enrolment.student.invalid"))).toBe(true);
    expect(shouldReloadEnrolClasses(api(404, "class.notFound"))).toBe(false);
    expect(shouldReloadEnrolClasses(new NetworkError())).toBe(false);
  });
});

describe("getTakeOutErrorKey", () => {
  it.each([
    [409, "enrolment.notApproved", "takeOutSheet.errors.notApproved"],
    [409, "class.started", "takeOutSheet.errors.started"],
    [404, "enrolment.notFound", "enrolment.errors.notFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getTakeOutErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getTakeOutErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getTakeOutErrorKey(new SessionExpiredError())).toBeNull();
  });
});

describe("the guest errors", () => {
  it.each([
    [409, "enrolment.class.full", "enrolStudent.errors.full"],
    [409, "class.started", "enrolStudent.errors.started"],
    [409, "class.cancelled", "enrolStudent.errors.cancelled"],
    [404, "class.notFound", "classDetails.notFound"],
    [403, "user.role.notAdmin", "createAccount.errors.generic"],
  ])("maps adding a guest %s %s to %s", (status, key, expected) => {
    expect(getAddGuestErrorKey(api(status, key))).toBe(expected);
  });

  it("maps a refused name or number to its own copy, and the transport failures like the rest", () => {
    expect(getAddGuestErrorKey(new ApiError(422, ["guest.name.required", "guest.whatsappNumber.invalid"]))).toBe(
      "enrolStudent.errors.invalidGuest",
    );
    expect(getAddGuestErrorKey(new ApiError(422, ["other"]))).toBe("createAccount.errors.generic");
    expect(getAddGuestErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
    expect(getAddGuestErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("reloads the classes when adding a guest found them stale", () => {
    expect(shouldReloadAddGuestClasses(api(409, "enrolment.class.full"))).toBe(true);
    expect(shouldReloadAddGuestClasses(api(409, "class.started"))).toBe(true);
    expect(shouldReloadAddGuestClasses(api(409, "class.cancelled"))).toBe(true);
    expect(shouldReloadAddGuestClasses(new ApiError(422, ["guest.name.required"]))).toBe(false);
  });

  it.each([
    [409, "class.started", "takeOutSheet.errors.started"],
    [404, "guest.notFound", "takeOutSheet.errors.guestNotFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps removing a guest %s %s to %s", (status, key, expected) => {
    expect(getRemoveGuestErrorKey(api(status, key))).toBe(expected);
  });

  it("shows nothing for an expired session when removing a guest, and reloads the class for a missing guest", () => {
    expect(getRemoveGuestErrorKey(new SessionExpiredError())).toBeNull();
    expect(shouldReloadClass(api(404, "guest.notFound"))).toBe(true);
  });
});

describe("isWaitingListClosedError", () => {
  it("recognizes the closed waiting list, and reloads the class for it", () => {
    expect(isWaitingListClosedError(api(409, "enrolment.waitingList.closed"))).toBe(true);
    expect(isWaitingListClosedError(api(409, "enrolment.alreadyOpen"))).toBe(false);
    expect(isWaitingListClosedError(new NetworkError())).toBe(false);
    expect(shouldReloadClass(api(409, "enrolment.waitingList.closed"))).toBe(true);
  });
});
