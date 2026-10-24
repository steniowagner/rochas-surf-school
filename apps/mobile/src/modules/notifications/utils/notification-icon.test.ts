import { notificationIcon } from "./notification-icon";

describe("notificationIcon", () => {
  it("draws a role.changed with the shield on the info tone", () => {
    expect(notificationIcon("role.changed")).toEqual({ name: "shield-checkmark-outline", tone: "info" });
  });

  it("keeps the glyph and tone of the other types", () => {
    expect(notificationIcon("registration.denied")).toEqual({ name: "close-circle-outline", tone: "bad" });
  });

  it.each(["broadcast.sent", "toString"])("draws a bell on the info tone for an unknown type (%s)", (type) => {
    expect(notificationIcon(type)).toEqual({ name: "notifications-outline", tone: "info" });
  });
});
