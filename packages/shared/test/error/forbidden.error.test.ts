import { DomainError, ForbiddenError } from "../../src/index";

describe("ForbiddenError", () => {
  test("has status 403 and the message", () => {
    const error = new ForbiddenError("user.status.notApproved");

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.name).toBe("ForbiddenError");
    expect(error.statusCode).toBe(403);
    expect(error.message).toBe("user.status.notApproved");
    expect(error.details).toBeUndefined();
  });

  test("keeps the details it was given", () => {
    const error = new ForbiddenError("user.status.notApproved", { status: "pending" });

    expect(error.details).toEqual({ status: "pending" });
  });
});
