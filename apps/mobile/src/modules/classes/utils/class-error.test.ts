import { ApiError, NetworkError, SessionExpiredError } from "@/services/api";

import {
  getClassErrorKey,
  getCancelClassErrorKey,
  getDeleteClassErrorKey,
  getEditClassErrorKey,
  getSeatsTaken,
  isClassCancelledError,
  isClassFinishedError,
  isClassNotEmptyError,
  isClassNotFoundError,
  isClassStartedError,
  getLocationErrorKey,
  isClassLocationArchivedError,
  isDuplicateLocationError,
  isInstructorsInvalidError,
  isLocationArchivedError,
  isLocationGoneError,
  isLocationNotFoundError,
} from "./class-error";

const api = (status: number, key: string) => new ApiError(status, [key]);

describe("getClassErrorKey", () => {
  it.each([
    [422, "class.startsAt.past", "newClass.errors.past"],
    [422, "class.instructors.invalid", "newClass.errors.instructors"],
    [422, "class.location.notFound", "newClass.errors.location"],
    [422, "class.location.archived", "newClass.errors.locationArchived"],
    [409, "location.name.duplicate", "locationSheet.duplicate"],
    [422, "class.batch.tooLarge", "createAccount.errors.generic"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getClassErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy", () => {
    expect(getClassErrorKey(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
  });

  it("shows nothing for an expired session", () => {
    expect(getClassErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("falls back to the generic copy for anything else", () => {
    expect(getClassErrorKey(new Error("boom"))).toBe(
      "createAccount.errors.generic",
    );
  });
});

describe("error predicates", () => {
  it("recognise only their own status and key", () => {
    expect(isDuplicateLocationError(api(409, "location.name.duplicate"))).toBe(
      true,
    );
    expect(isDuplicateLocationError(api(422, "location.name.duplicate"))).toBe(
      false,
    );
    expect(isLocationNotFoundError(api(422, "class.location.notFound"))).toBe(
      true,
    );
    expect(isLocationNotFoundError(new Error("x"))).toBe(false);
    expect(
      isInstructorsInvalidError(api(422, "class.instructors.invalid")),
    ).toBe(true);
    expect(isInstructorsInvalidError(api(422, "other"))).toBe(false);
  });
});

describe("getEditClassErrorKey", () => {
  it.each([
    [409, "class.started", "editClass.errors.started"],
    [409, "class.finished", "editClass.errors.finished"],
    [409, "class.cancelled", "editClass.errors.cancelled"],
    [404, "class.notFound", "classDetails.notFound"],
    [422, "class.startsAt.past", "newClass.errors.past"],
    [422, "class.instructors.invalid", "newClass.errors.instructors"],
    [422, "class.location.notFound", "newClass.errors.location"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getEditClassErrorKey(api(status, key))).toBe(expected);
  });

  it("maps a capacity below the seats taken to its own copy", () => {
    const error = new ApiError(422, ["class.capacity.belowSeatsTaken"], {
      seatsTaken: 8,
    });

    expect(getEditClassErrorKey(error)).toBe("editClass.errors.seatsTaken");
    expect(getSeatsTaken(error)).toBe(8);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getEditClassErrorKey(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
    expect(getEditClassErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("falls back to the generic copy for anything else", () => {
    expect(getEditClassErrorKey(new Error("boom"))).toBe(
      "createAccount.errors.generic",
    );
  });
});

describe("edit error predicates", () => {
  it("recognise only their own status and key", () => {
    expect(isClassStartedError(api(409, "class.started"))).toBe(true);
    expect(isClassStartedError(api(422, "class.started"))).toBe(false);
    expect(isClassFinishedError(api(409, "class.finished"))).toBe(true);
    expect(isClassFinishedError(new Error("x"))).toBe(false);
    expect(isClassNotFoundError(api(404, "class.notFound"))).toBe(true);
    expect(isClassNotFoundError(api(404, "other"))).toBe(false);
  });

  it("reads the seats taken only from their own error and only as a number", () => {
    expect(
      getSeatsTaken(api(422, "class.capacity.belowSeatsTaken")),
    ).toBeNull();
    expect(
      getSeatsTaken(
        new ApiError(422, ["class.capacity.belowSeatsTaken"], {
          seatsTaken: "8",
        }),
      ),
    ).toBeNull();
    expect(getSeatsTaken(api(422, "class.startsAt.past"))).toBeNull();
  });
});

describe("getCancelClassErrorKey", () => {
  it.each([
    [409, "class.cancelled", "cancelClass.errors.cancelled"],
    [409, "class.finished", "cancelClass.errors.finished"],
    [404, "class.notFound", "classDetails.notFound"],
    [
      422,
      "class.cancellationMessage.max.length",
      "createAccount.errors.generic",
    ],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getCancelClassErrorKey(api(status, key))).toBe(expected);
  });

  it("maps no answer to the no-connection copy and an expired session to nothing", () => {
    expect(getCancelClassErrorKey(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
    expect(getCancelClassErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("falls back to the generic copy for anything else", () => {
    expect(getCancelClassErrorKey(new Error("boom"))).toBe(
      "createAccount.errors.generic",
    );
  });

  it("recognises a cancelled class only by its own status and key", () => {
    expect(isClassCancelledError(api(409, "class.cancelled"))).toBe(true);
    expect(isClassCancelledError(api(404, "class.cancelled"))).toBe(false);
    expect(isClassCancelledError(new Error("x"))).toBe(false);
  });
});

describe("getDeleteClassErrorKey", () => {
  it.each([
    [409, "class.started", "deleteClass.errors.started"],
    [409, "class.cancelled", "deleteClass.errors.cancelled"],
    [404, "class.notFound", "classDetails.notFound"],
    [500, "INTERNAL_SERVER_ERROR", "createAccount.errors.generic"],
  ])("maps %s %s to %s", (status, key, expected) => {
    expect(getDeleteClassErrorKey(api(status, key))).toBe(expected);
  });

  it("shows no toast for a class that is not empty or an expired session", () => {
    expect(
      getDeleteClassErrorKey(api(409, "class.delete.notEmpty")),
    ).toBeNull();
    expect(getDeleteClassErrorKey(new SessionExpiredError())).toBeNull();
  });

  it("maps no answer to the no-connection copy and anything else to the generic copy", () => {
    expect(getDeleteClassErrorKey(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
    expect(getDeleteClassErrorKey(new Error("boom"))).toBe(
      "createAccount.errors.generic",
    );
  });

  it("recognises a class that is not empty only by its own status and key", () => {
    expect(isClassNotEmptyError(api(409, "class.delete.notEmpty"))).toBe(true);
    expect(isClassNotEmptyError(api(422, "class.delete.notEmpty"))).toBe(false);
    expect(isClassNotEmptyError(new Error("x"))).toBe(false);
  });
});

describe("getLocationErrorKey", () => {
  it.each([
    [409, "location.archived"],
    [404, "location.notFound"],
  ])("maps %s %s to the gone copy", (status, key) => {
    expect(getLocationErrorKey(api(status, key))).toBe(
      "locationSheet.errors.gone",
    );
  });

  it("falls back to the class error mapping", () => {
    expect(getLocationErrorKey(new SessionExpiredError())).toBeNull();
    expect(getLocationErrorKey(new NetworkError())).toBe(
      "createAccount.errors.noConnection",
    );
    expect(getLocationErrorKey(api(500, "x"))).toBe(
      "createAccount.errors.generic",
    );
  });

  it("recognises the removed-location errors only by their own status and key", () => {
    expect(isLocationArchivedError(api(409, "location.archived"))).toBe(true);
    expect(isLocationArchivedError(api(422, "location.archived"))).toBe(false);
    expect(isLocationGoneError(api(404, "location.notFound"))).toBe(true);
    expect(isLocationGoneError(api(409, "location.name.duplicate"))).toBe(
      false,
    );
    expect(
      isClassLocationArchivedError(api(422, "class.location.archived")),
    ).toBe(true);
    expect(
      isClassLocationArchivedError(api(409, "class.location.archived")),
    ).toBe(false);
  });
});
