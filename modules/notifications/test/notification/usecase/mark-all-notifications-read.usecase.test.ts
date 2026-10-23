import { MarkAllNotificationsRead, Notification } from "../../../src";
import { FakeClockProvider, FakeNotificationRepository, minutesAgo, NOW, USER_A, USER_B } from "../../mock";

function notification(userId: string, readAt: Date | null = null): Notification {
  return new Notification({ userId, type: "registration.approved", params: {}, readAt });
}

describe("MarkAllNotificationsRead", () => {
  it("marks every unread notification of the caller read, and no one else's", async () => {
    const repository = new FakeNotificationRepository();
    await repository.createMany([
      notification(USER_A),
      notification(USER_A),
      notification(USER_A),
      notification(USER_B),
      notification(USER_B),
    ]);

    await new MarkAllNotificationsRead(repository, new FakeClockProvider(NOW)).execute({
      userId: USER_A,
    });

    expect(await repository.countUnread(USER_A)).toBe(0);
    expect(repository.items.slice(0, 3).map((item) => item.readAt)).toEqual([NOW, NOW, NOW]);
    expect(await repository.countUnread(USER_B)).toBe(2);
  });

  it("keeps the first read time of notifications already read", async () => {
    const repository = new FakeNotificationRepository();
    await repository.createMany([notification(USER_A, minutesAgo(60)), notification(USER_A)]);

    await new MarkAllNotificationsRead(repository, new FakeClockProvider(NOW)).execute({
      userId: USER_A,
    });

    expect(repository.items.map((item) => item.readAt)).toEqual([minutesAgo(60), NOW]);
  });

  it("changes nothing when nothing is unread", async () => {
    const repository = new FakeNotificationRepository();
    await repository.createMany([notification(USER_A, minutesAgo(60))]);

    await new MarkAllNotificationsRead(repository, new FakeClockProvider(NOW)).execute({
      userId: USER_A,
    });

    expect(repository.items[0].readAt).toEqual(minutesAgo(60));
  });
});
