import { CountUnreadNotifications, Notification } from "../../../src";
import { FakeNotificationRepository, NOW, USER_A, USER_B, USER_C } from "../../mock";

function notification(userId: string, readAt: Date | null = null): Notification {
  return new Notification({ userId, type: "registration.approved", params: {}, readAt });
}

describe("CountUnreadNotifications", () => {
  it("counts only the caller's unread notifications", async () => {
    const repository = new FakeNotificationRepository();
    await repository.createMany([
      notification(USER_A),
      notification(USER_A),
      notification(USER_A),
      notification(USER_A, NOW),
      notification(USER_B),
      notification(USER_B),
    ]);

    expect(await new CountUnreadNotifications(repository).execute({ userId: USER_A })).toEqual({
      count: 3,
    });
  });

  it("answers 0 for a user without notifications", async () => {
    const repository = new FakeNotificationRepository();

    expect(await new CountUnreadNotifications(repository).execute({ userId: USER_C })).toEqual({
      count: 0,
    });
  });
});
