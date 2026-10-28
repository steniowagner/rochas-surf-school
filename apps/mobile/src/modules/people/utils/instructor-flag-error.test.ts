import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import { getInstructorFlagErrorKey } from "./instructor-flag-error";

describe("getInstructorFlagErrorKey", () => {
  it.each([
    [new ApiError(409, ["user.role.changeNotAllowed"]), "people.roleErrors.changed"],
    [new ApiError(409, ["people.isInstructor.notAdmin"]), "people.roleErrors.changed"],
    [new ApiError(409, ["user.status.notApproved"]), "people.roleErrors.notApproved"],
    [new ApiError(404, ["user.notFound"]), "people.roleErrors.notApproved"],
    [new NetworkError(), "createAccount.errors.noConnection"],
    [new SessionExpiredError(), null],
    [new ApiError(409, ["something.else"]), "createAccount.errors.generic"],
    [new ApiError(409, []), "createAccount.errors.generic"],
    [new ApiError(422, ["people.isInstructor.invalid"]), "createAccount.errors.generic"],
    [new Error("boom"), "createAccount.errors.generic"],
  ])("maps %p to %p", (error, key) => {
    expect(getInstructorFlagErrorKey(error)).toBe(key);
  });
});
