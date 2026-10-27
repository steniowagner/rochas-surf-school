import { notificationIcon } from "./notification-icon";

describe("notificationIcon", () => {
  it("draws a role.changed with the shield on the info tone", () => {
    expect(notificationIcon("role.changed")).toEqual({ name: "shield-checkmark-outline", tone: "info" });
  });

  it.each([
    ["account.removed", "person-remove-outline", "bad"],
    ["account.restored", "person-add-outline", "ok"],
  ])("draws an %s with %s on the %s tone", (type, name, tone) => {
    expect(notificationIcon(type)).toEqual({ name, tone });
  });

  it("draws a broadcast with the megaphone on the info tone", () => {
    expect(notificationIcon("broadcast")).toEqual({ name: "megaphone-outline", tone: "info" });
  });

  it("keeps the glyph and tone of the other types", () => {
    expect(notificationIcon("registration.denied")).toEqual({ name: "close-circle-outline", tone: "bad" });
  });

  it.each([
    ["reactivation.requested", "refresh-circle-outline", "info"],
    ["reactivation.approved", "checkmark-circle-outline", "ok"],
    ["reactivation.denied", "close-circle-outline", "bad"],
  ])("draws a %s with %s on the %s tone", (type, name, tone) => {
    expect(notificationIcon(type)).toEqual({ name, tone });
  });

  it.each(["broadcast.sent", "toString"])("draws a bell on the info tone for an unknown type (%s)", (type) => {
    expect(notificationIcon(type)).toEqual({ name: "notifications-outline", tone: "info" });
  });
});
