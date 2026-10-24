import { ApiError, NetworkError } from "@/services/api";

import { isLastAdminError } from "./last-admin-error";

describe("isLastAdminError", () => {
  it("recognizes only the 409 user.role.lastAdmin", () => {
    expect(isLastAdminError(new ApiError(409, ["user.role.lastAdmin"]))).toBe(true);
    expect(isLastAdminError(new ApiError(409, ["something.else"]))).toBe(false);
    expect(isLastAdminError(new ApiError(403, ["user.role.lastAdmin"]))).toBe(false);
    expect(isLastAdminError(new NetworkError())).toBe(false);
  });
});
