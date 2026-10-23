import {
  FakeClockProvider,
  FakeNotificationRepository,
  FakePushProvider,
  FakePushTicketRepository,
  FakePushTokenRepository,
  FakeRecipientsProvider,
  minutesAgo,
  NOW,
  pushTicket,
  pushToken,
  USER_A,
  USER_B,
  USER_C,
} from "../../mock";
import { Notification } from "../../../src";

describe("FakePushTokenRepository", () => {
  it("upserts by token, moving it to the new user", async () => {
    const repository = new FakePushTokenRepository([pushToken("ExpoPushToken[a]", USER_A)]);

    await repository.upsert(pushToken("ExpoPushToken[a]", USER_B, "es"));

    expect(repository.items).toHaveLength(1);
    expect(repository.items[0].userId).toBe(USER_B);
    expect(repository.items[0].locale).toBe("es");
  });

  it("finds by user ids and deletes by token, tokens or user", async () => {
    const repository = new FakePushTokenRepository([
      pushToken("ExpoPushToken[a]", USER_A),
      pushToken("ExpoPushToken[b]", USER_A),
      pushToken("ExpoPushToken[c]", USER_B),
    ]);

    expect(await repository.findByUserIds([USER_B])).toHaveLength(1);

    await repository.deleteForUser(USER_B, "ExpoPushToken[a]");
    expect(repository.tokens()).toHaveLength(3);
    await repository.deleteForUser(USER_A, "ExpoPushToken[a]");
    expect(repository.tokens()).toEqual(["ExpoPushToken[b]", "ExpoPushToken[c]"]);
    await repository.deleteByToken("ExpoPushToken[b]");
    expect(repository.tokens()).toEqual(["ExpoPushToken[c]"]);
    await repository.deleteByTokens(["ExpoPushToken[c]"]);
    expect(repository.tokens()).toEqual([]);
  });

  it("starts empty by default", () => {
    expect(new FakePushTokenRepository().items).toEqual([]);
  });
});

describe("FakePushTicketRepository", () => {
  it("creates, finds the tickets created at or before a date, and deletes", async () => {
    const repository = new FakePushTicketRepository();
    await repository.createMany([
      pushTicket("k1", "t1", minutesAgo(20)),
      pushTicket("k2", "t2", minutesAgo(5)),
    ]);

    const due = await repository.findCreatedBefore(minutesAgo(15));
    expect(due.map((item) => item.id)).toEqual(["k1"]);

    await repository.deleteByIds(["k1"]);
    expect(repository.ids()).toEqual(["k2"]);
  });
});

describe("FakePushProvider", () => {
  const message = {
    token: "ExpoPushToken[a]",
    locale: "en" as const,
    type: "registration.approved" as const,
    params: {},
    notificationId: "n1",
  };

  it("records messages and answers ok tickets unless configured", async () => {
    const provider = new FakePushProvider();
    provider.ticketsByToken["ExpoPushToken[b]"] = { status: "error" };

    const tickets = await provider.send([message, { ...message, token: "ExpoPushToken[b]" }]);

    expect(tickets).toEqual([
      { status: "ok", id: "ticket-ExpoPushToken[a]" },
      { status: "error" },
    ]);
    expect(provider.sent).toHaveLength(2);
  });

  it("throws the configured send error after recording", async () => {
    const provider = new FakePushProvider();
    provider.sendError = new Error("down");

    await expect(provider.send([message])).rejects.toThrow("down");
    expect(provider.sent).toHaveLength(1);
  });

  it("answers only the configured receipts and can fail", async () => {
    const provider = new FakePushProvider();
    provider.receipts = { k1: { status: "ok" } };

    expect(await provider.getReceipts(["k1", "k2"])).toEqual({ k1: { status: "ok" } });
    expect(provider.receiptRequests).toEqual([["k1", "k2"]]);

    provider.receiptsError = new Error("down");
    await expect(provider.getReceipts(["k1"])).rejects.toThrow("down");
  });
});

describe("other fakes", () => {
  it("FakeNotificationRepository stores and can fail", async () => {
    const repository = new FakeNotificationRepository();
    const notification = new Notification({ userId: USER_A, type: "registration.approved", params: {} });

    await repository.createMany([notification]);
    expect(repository.items).toEqual([notification]);

    repository.failWith = new Error("db");
    await expect(repository.createMany([notification])).rejects.toThrow("db");
  });

  it("FakeNotificationRepository pages a user's notifications newest first, by id on a tie", async () => {
    const repository = new FakeNotificationRepository();
    const at = (minutes: number) => minutesAgo(minutes);
    const tieLow = new Notification({ id: "00000000-0000-4000-8000-000000000001", userId: USER_A, type: "registration.approved", params: {}, createdAt: at(1) });
    const tieHigh = new Notification({ id: "00000000-0000-4000-8000-000000000002", userId: USER_A, type: "registration.approved", params: {}, createdAt: at(1) });
    const newest = new Notification({ userId: USER_A, type: "registration.approved", params: {}, createdAt: at(0) });
    const oldest = new Notification({ userId: USER_A, type: "registration.approved", params: {}, createdAt: at(5) });
    const foreign = new Notification({ userId: USER_B, type: "registration.approved", params: {}, createdAt: at(0) });
    await repository.createMany([oldest, tieLow, foreign, newest, tieHigh]);

    const first = await repository.findPage(USER_A, 1, 3);
    const second = await repository.findPage(USER_A, 2, 3);

    expect(first.items.map((item) => item.id)).toEqual([newest.id, tieHigh.id, tieLow.id]);
    expect(first.total).toBe(4);
    expect(second.items.map((item) => item.id)).toEqual([oldest.id]);
    expect(await repository.findPage(USER_C, 1, 20)).toEqual({ items: [], total: 0 });
  });

  it("FakeNotificationRepository counts and marks only the user's unread notifications", async () => {
    const repository = new FakeNotificationRepository();
    const first = new Notification({ userId: USER_A, type: "registration.approved", params: {} });
    const second = new Notification({ userId: USER_A, type: "registration.approved", params: {} });
    const foreign = new Notification({ userId: USER_B, type: "registration.approved", params: {} });
    await repository.createMany([first, second, foreign]);

    expect(await repository.countUnread(USER_A)).toBe(2);
    expect(await repository.markRead(USER_B, first.id, NOW)).toBe(false);
    expect(await repository.markRead(USER_A, "unknown", NOW)).toBe(false);
    expect(await repository.markRead(USER_A, first.id, NOW)).toBe(true);
    expect(await repository.markRead(USER_A, first.id, minutesAgo(-5))).toBe(true);
    expect(repository.items[0].readAt).toEqual(NOW);
    expect(await repository.countUnread(USER_A)).toBe(1);

    await repository.markAllRead(USER_A, minutesAgo(-10));

    expect(await repository.countUnread(USER_A)).toBe(0);
    expect(repository.items[0].readAt).toEqual(NOW);
    expect(repository.items[1].readAt).toEqual(minutesAgo(-10));
    expect(repository.items[2].readAt).toBeNull();
    expect(await repository.countUnread(USER_B)).toBe(1);
  });

  it("FakeRecipientsProvider returns a copy of its admins", async () => {
    const provider = new FakeRecipientsProvider([USER_A]);
    expect(await provider.findApprovedAdminIds()).toEqual([USER_A]);
    expect(await new FakeRecipientsProvider().findApprovedAdminIds()).toEqual([]);
  });

  it("FakeClockProvider returns a copy of its date", () => {
    expect(new FakeClockProvider(NOW).now()).toEqual(NOW);
    expect(new FakeClockProvider(NOW).now()).not.toBe(NOW);
  });
});
