import { NotFoundError } from "@rochas-surf-school/shared";
import { MarkNotificationRead, Notification } from "../../../src";
import { FakeClockProvider, FakeNotificationRepository, minutesAgo, NOW, USER_A, USER_B } from "../../mock";

describe("MarkNotificationRead", () => {
  let repository: FakeNotificationRepository;
  let own: Notification;
  let foreign: Notification;

  beforeEach(async () => {
    repository = new FakeNotificationRepository();
    own = new Notification({ userId: USER_A, type: "registration.approved", params: {} });
    foreign = new Notification({ userId: USER_B, type: "registration.approved", params: {} });
    await repository.createMany([own, foreign]);
  });

  it("marks the caller's notification read at the clock's now", async () => {
    await new MarkNotificationRead(repository, new FakeClockProvider(NOW)).execute({
      userId: USER_A,
      notificationId: own.id,
    });

    expect(repository.items[0].readAt).toEqual(NOW);
    expect(await repository.countUnread(USER_A)).toBe(0);
  });

  it("succeeds again on a read notification and keeps its first read time", async () => {
    await new MarkNotificationRead(repository, new FakeClockProvider(NOW)).execute({
      userId: USER_A,
      notificationId: own.id,
    });
    await new MarkNotificationRead(repository, new FakeClockProvider(minutesAgo(-30))).execute({
      userId: USER_A,
      notificationId: own.id,
    });

    expect(repository.items[0].readAt).toEqual(NOW);
  });

  it.each([
    ["another user's notification", () => foreign.id],
    ["an unknown id", () => "44444444-4444-4444-8444-444444444444"],
    ["an id that isn't a UUID", () => "not-a-uuid"],
    ["an empty id", () => ""],
  ])("answers not found for %s and changes nothing", async (_, id) => {
    const error = await new MarkNotificationRead(repository, new FakeClockProvider(NOW))
      .execute({ userId: USER_A, notificationId: id() })
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe("notification.notFound");
    expect(repository.items.every((item) => item.readAt === null)).toBe(true);
  });
});
