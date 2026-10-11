import { ConflictError, DomainError } from "../../src/index";

describe("ConflictError", () => {
  test("has status 409 and the message", () => {
    const error = new ConflictError("schoolRules.version.outdated");

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.name).toBe("ConflictError");
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe("schoolRules.version.outdated");
    expect(error.details).toBeUndefined();
  });

  test("keeps the details it was given", () => {
    const error = new ConflictError("schoolRules.version.outdated", { currentVersion: 4 });

    expect(error.details).toEqual({ currentVersion: 4 });
  });
});
