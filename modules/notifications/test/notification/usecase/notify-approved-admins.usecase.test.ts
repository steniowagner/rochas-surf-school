import { Notify, NotifyApprovedAdmins } from "../../../src";
import {
  FakeClockProvider,
  FakeNotificationRepository,
  FakePushProvider,
  FakePushTicketRepository,
  FakePushTokenRepository,
  FakeRecipientsProvider,
  NOW,
  pushToken,
  USER_A,
  USER_B,
} from "../../mock";

function setup(adminIds: string[]) {
  const notifications = new FakeNotificationRepository();
  const provider = new FakePushProvider();
  const notify = new Notify(
    notifications,
    new FakePushTokenRepository([pushToken("ExpoPushToken[a]", USER_A, "pt-BR")]),
    new FakePushTicketRepository(),
    provider,
    new FakeClockProvider(NOW),
  );
  return {
    notifications,
    provider,
    usecase: new NotifyApprovedAdmins(new FakeRecipientsProvider(adminIds), notify),
  };
}

describe("NotifyApprovedAdmins", () => {
  it("notifies every approved admin of the new registration", async () => {
    const { notifications, provider, usecase } = setup([USER_A, USER_B]);

    await usecase.execute({ name: "Ana Souza", userId: "new-user" });

    expect(notifications.items.map((item) => [item.userId, item.type, item.params])).toEqual([
      [USER_A, "registration.pending", { name: "Ana Souza", userId: "new-user" }],
      [USER_B, "registration.pending", { name: "Ana Souza", userId: "new-user" }],
    ]);
    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0].token).toBe("ExpoPushToken[a]");
  });

  it("notifies every approved admin of a reactivation request when asked", async () => {
    const { notifications, usecase } = setup([USER_A]);

    await usecase.execute({ name: "Ana Souza", userId: "old-user", type: "reactivation.requested" });

    expect(notifications.items.map((item) => [item.userId, item.type, item.params])).toEqual([
      [USER_A, "reactivation.requested", { name: "Ana Souza", userId: "old-user" }],
    ]);
  });

  it("stores and sends nothing with no approved admin", async () => {
    const { notifications, provider, usecase } = setup([]);

    await usecase.execute({ name: "Ana Souza", userId: "new-user" });

    expect(notifications.items).toEqual([]);
    expect(provider.sent).toEqual([]);
  });
});
