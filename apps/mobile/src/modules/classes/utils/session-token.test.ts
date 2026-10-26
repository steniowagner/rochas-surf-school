import { newSessionToken } from "./session-token";

describe("newSessionToken", () => {
  it("is a UUID v4 the backend accepts as a session token", () => {
    const token = newSessionToken();

    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(token).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
  });

  it("is new every time", () => {
    expect(newSessionToken()).not.toBe(newSessionToken());
  });
});
