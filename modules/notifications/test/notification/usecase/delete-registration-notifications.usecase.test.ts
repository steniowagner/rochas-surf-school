import { DeleteRegistrationNotifications, Notification, NotificationType } from "../../../src";
import { FakeNotificationRepository, USER_A, USER_B } from "../../mock";

function notification(userId: string, type: NotificationType, params: Record<string, unknown>) {
  return new Notification({ userId, type, params });
}

function setup() {
  const notifications = new FakeNotificationRepository();
  notifications.items = [
    notification(USER_A, "registration.pending", { name: "Ana", userId: "erased" }),
    notification(USER_B, "registration.pending", { name: "Ana", userId: "erased" }),
    notification(USER_A, "registration.pending", { name: "Bia", userId: "other" }),
    notification(USER_A, "registration.pending", { name: "Old" }),
    notification(USER_A, "registration.approved", { userId: "erased" }),
  ];
  return { notifications, usecase: new DeleteRegistrationNotifications(notifications) };
}

describe("DeleteRegistrationNotifications", () => {
  it("deletes the registration.pending notifications about the given accounts", async () => {
    const { notifications, usecase } = setup();

    await usecase.execute({ userIds: ["erased"] });

    expect(notifications.items.map((item) => [item.type, item.params])).toEqual([
      ["registration.pending", { name: "Bia", userId: "other" }],
      ["registration.pending", { name: "Old" }],
      ["registration.approved", { userId: "erased" }],
    ]);
  });

  it("keeps the notifications about other accounts and of other types", async () => {
    const { notifications, usecase } = setup();

    await usecase.execute({ userIds: ["nobody"] });

    expect(notifications.items).toHaveLength(5);
  });

  it("deletes nothing for an empty list", async () => {
    const { notifications, usecase } = setup();
    const spy = jest.spyOn(notifications, "deleteRegistrationPending");

    await expect(usecase.execute({ userIds: [] })).resolves.toBeUndefined();

    expect(spy).not.toHaveBeenCalled();
    expect(notifications.items).toHaveLength(5);
  });
});
