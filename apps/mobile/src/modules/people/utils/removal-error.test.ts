import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import { getRemovalErrorKey, getRestoreErrorKey, isStaleRestoreError } from "./removal-error";

describe("getRemovalErrorKey", () => {
  it.each([
    [new ApiError(409, ["user.role.lastAdmin"]), "people.roleErrors.lastAdmin"],
    [new ApiError(409, ["user.status.notApproved"]), "people.roleErrors.notApproved"],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [new SessionExpiredError(), null],
    [new ApiError(500, []), "createAccount.errors.generic"],
  ])("maps %p to %p", (error, key) => {
    expect(getRemovalErrorKey(error)).toBe(key);
  });
});

describe("getRestoreErrorKey", () => {
  it.each([
    [new ApiError(409, ["user.status.notRemoved"]), "people.removed.errors.notRemoved"],
    [new ApiError(409, ["removal.window.ended"]), "people.removed.errors.windowEnded"],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [new SessionExpiredError(), null],
    [new ApiError(409, ["something.else"]), "createAccount.errors.generic"],
    [new ApiError(404, ["user.notFound"]), "createAccount.errors.generic"],
  ])("maps %p to %p", (error, key) => {
    expect(getRestoreErrorKey(error)).toBe(key);
  });
});

describe("isStaleRestoreError", () => {
  it.each([
    [new ApiError(409, ["user.status.notRemoved"]), true],
    [new ApiError(409, ["removal.window.ended"]), true],
    [new ApiError(409, []), false],
    [new ApiError(403, ["user.status.notRemoved"]), false],
    [new NetworkError(), false],
  ])("answers for %p", (error, stale) => {
    expect(isStaleRestoreError(error)).toBe(stale);
  });
});
