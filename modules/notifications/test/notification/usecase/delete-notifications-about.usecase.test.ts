import { DeleteNotificationsAbout, Notification, NotificationType } from "../../../src";
import { FakeNotificationRepository, USER_A, USER_B } from "../../mock";

function notification(userId: string, type: NotificationType, params: Record<string, unknown>) {
  return new Notification({ userId, type, params });
}

function setup() {
  const notifications = new FakeNotificationRepository();
  notifications.items = [
    notification(USER_A, "registration.pending", { name: "Ana", userId: "erased" }),
    notification(USER_A, "reactivation.requested", { name: "Ana", userId: "erased" }),
    notification(USER_A, "enrolment.requested", { studentName: "Ana", studentId: "erased" }),
    notification(USER_B, "enrolment.cancelled", { studentName: "Ana", studentId: "erased" }),
    notification(USER_A, "registration.pending", { name: "Bia", userId: "other" }),
    notification(USER_A, "reactivation.requested", { name: "Bia", userId: "other" }),
    notification(USER_A, "enrolment.requested", { studentName: "Bia", studentId: "other" }),
    notification(USER_B, "enrolment.cancelled", { studentName: "Bia", studentId: "other" }),
    notification(USER_A, "enrolment.requested", { studentName: "Old" }),
    notification(USER_A, "enrolment.cancelled", { studentName: "Ana", userId: "erased" }),
    notification(USER_A, "registration.approved", { userId: "erased" }),
    notification(USER_A, "enrolment.approved", { studentId: "erased" }),
  ];
  return { notifications, usecase: new DeleteNotificationsAbout(notifications) };
}

describe("DeleteNotificationsAbout", () => {
  it("deletes the four notification types about the given people in anyone's inbox", async () => {
    const { notifications, usecase } = setup();

    await usecase.execute({ userIds: ["erased"] });

    expect(notifications.items.map((item) => [item.type, item.params])).toEqual([
      ["registration.pending", { name: "Bia", userId: "other" }],
      ["reactivation.requested", { name: "Bia", userId: "other" }],
      ["enrolment.requested", { studentName: "Bia", studentId: "other" }],
      ["enrolment.cancelled", { studentName: "Bia", studentId: "other" }],
      ["enrolment.requested", { studentName: "Old" }],
      ["enrolment.cancelled", { studentName: "Ana", userId: "erased" }],
      ["registration.approved", { userId: "erased" }],
      ["enrolment.approved", { studentId: "erased" }],
    ]);
  });

  it("deletes the notifications about every person in the list", async () => {
    const { notifications, usecase } = setup();

    await usecase.execute({ userIds: ["erased", "other"] });

    expect(notifications.items.map((item) => item.type)).toEqual([
      "enrolment.requested",
      "enrolment.cancelled",
      "registration.approved",
      "enrolment.approved",
    ]);
  });

  it("keeps everything when nobody in the list has a notification", async () => {
    const { notifications, usecase } = setup();

    await usecase.execute({ userIds: ["nobody"] });

    expect(notifications.items).toHaveLength(12);
  });

  it("deletes nothing for an empty list", async () => {
    const { notifications, usecase } = setup();
    const spy = jest.spyOn(notifications, "deleteAbout");

    await expect(usecase.execute({ userIds: [] })).resolves.toBeUndefined();

    expect(spy).not.toHaveBeenCalled();
    expect(notifications.items).toHaveLength(12);
  });

  it("propagates a repository failure", async () => {
    const { notifications, usecase } = setup();
    notifications.failWith = new Error("db down");

    await expect(usecase.execute({ userIds: ["erased"] })).rejects.toThrow("db down");
    expect(notifications.items).toHaveLength(12);
  });
});
