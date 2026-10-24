import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import { getRoleChangeErrorKey } from "./role-change-error";

describe("getRoleChangeErrorKey", () => {
  it.each([
    [new ApiError(409, ["user.role.changeNotAllowed"]), "people.roleErrors.changed"],
    [new ApiError(409, ["user.role.lastAdmin"]), "people.roleErrors.lastAdmin"],
    [new ApiError(409, ["user.status.notApproved"]), "people.roleErrors.notApproved"],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [new SessionExpiredError(), null],
    [new ApiError(409, ["something.else"]), "createAccount.errors.generic"],
    [new ApiError(409, []), "createAccount.errors.generic"],
    [new ApiError(403, ["user.status.notApproved"]), "createAccount.errors.generic"],
    [new ApiError(403, ["user.role.self"]), "createAccount.errors.generic"],
    [new ApiError(500, ["INTERNAL_SERVER_ERROR"]), "createAccount.errors.generic"],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("maps %p to %p", (error, key) => {
    expect(getRoleChangeErrorKey(error)).toBe(key);
  });
});
