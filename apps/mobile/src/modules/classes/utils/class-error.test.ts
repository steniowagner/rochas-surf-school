import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import {
  getClassErrorKey,
  isDuplicateLocationError,
  isInstructorsInvalidError,
  isLocationNotFoundError,
} from "./class-error";

const api = (status: number, key: string) => new ApiError(status, [key]);

describe("getClassErrorKey", () => {
  it.each([
    [422, "class.startsAt.past", "newClass.errors.past"],
    [422, "class.instructors.invalid", "newClass.errors.instructors"],
    [422, "class.location.notFound", "newClass.errors.location"],
    [409, "location.name.duplicate", "locationSheet.duplicate"],
    [422, "class.batch.tooLarge", "createAccount.errors.generic"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getClassErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy", () => {
    expect(getClassErrorKey(new NetworkError())).toBe("createAccount.errors.noConnection");
  });

  it("shows nothing for an expired session", () => {
    expect(getClassErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("falls back to the generic copy for anything else", () => {
    expect(getClassErrorKey(new Error("boom"))).toBe("createAccount.errors.generic");
  });
});

describe("error predicates", () => {
  it("recognise only their own status and key", () => {
    expect(isDuplicateLocationError(api(409, "location.name.duplicate"))).toBe(true);
    expect(isDuplicateLocationError(api(422, "location.name.duplicate"))).toBe(false);
    expect(isLocationNotFoundError(api(422, "class.location.notFound"))).toBe(true);
    expect(isLocationNotFoundError(new Error("x"))).toBe(false);
    expect(isInstructorsInvalidError(api(422, "class.instructors.invalid"))).toBe(true);
    expect(isInstructorsInvalidError(api(422, "other"))).toBe(false);
  });
});
