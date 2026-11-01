import { buildNotification } from "../notifications.test-utils";

import { toAdminMessage } from "./admin-message";

describe("toAdminMessage", () => {
  it("joins the admin's text with the notification's time and class", () => {
    const adminMessage = { title: "Aviso", text: "Oi", sender: null };

    expect(
      toAdminMessage(
        buildNotification(1, {
          type: "class.message",
          classId: "c-1",
          createdAt: "2026-10-20T12:00:00.000Z",
          adminMessage,
        }),
      ),
    ).toEqual({ ...adminMessage, createdAt: "2026-10-20T12:00:00.000Z", classId: "c-1" });
  });

  it("answers null for a notification without an admin's text", () => {
    expect(toAdminMessage(buildNotification(1))).toBeNull();
  });
});
