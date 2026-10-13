import { Notify } from "../../../src";
import {
  FakeClockProvider,
  FakeNotificationRepository,
  FakePushProvider,
  FakePushTicketRepository,
  FakePushTokenRepository,
  NOW,
  pushToken,
  USER_A,
  USER_B,
  USER_C,
} from "../../mock";

function setup(tokens = [
  pushToken("ExpoPushToken[a1]", USER_A, "pt-BR"),
  pushToken("ExpoPushToken[a2]", USER_A, "es"),
  pushToken("ExpoPushToken[b1]", USER_B, "en"),
]) {
  const notifications = new FakeNotificationRepository();
  const tokens$ = new FakePushTokenRepository(tokens);
  const tickets = new FakePushTicketRepository();
  const provider = new FakePushProvider();
  const usecase = new Notify(notifications, tokens$, tickets, provider, new FakeClockProvider(NOW));
  return { notifications, tokens: tokens$, tickets, provider, usecase };
}

describe("Notify", () => {
  it("stores one notification per user and sends one message per device with its locale", async () => {
    const { notifications, provider, usecase } = setup();

    await usecase.execute({
      userIds: [USER_A, USER_B],
      type: "registration.pending",
      params: { name: "Ana" },
    });

    expect(notifications.items.map((item) => item.userId)).toEqual([USER_A, USER_B]);
    const [forA, forB] = notifications.items;
    expect(forA.type).toBe("registration.pending");
    expect(forA.params).toEqual({ name: "Ana" });
    expect(provider.sent).toEqual([
      { token: "ExpoPushToken[a1]", locale: "pt-BR", type: "registration.pending", params: { name: "Ana" }, notificationId: forA.id },
      { token: "ExpoPushToken[a2]", locale: "es", type: "registration.pending", params: { name: "Ana" }, notificationId: forA.id },
      { token: "ExpoPushToken[b1]", locale: "en", type: "registration.pending", params: { name: "Ana" }, notificationId: forB.id },
    ]);
  });

  it("stores every notification before sending the first push", async () => {
    const { notifications, provider, usecase } = setup();
    let storedWhenSending = 0;
    const send = provider.send.bind(provider);
    provider.send = async (messages) => {
      storedWhenSending = notifications.items.length;
      return send(messages);
    };

    await usecase.execute({ userIds: [USER_A, USER_B], type: "registration.approved", params: {} });

    expect(storedWhenSending).toBe(2);
  });

  it("stores the notification only for a user with no devices, and sends nothing", async () => {
    const { notifications, provider, tickets, usecase } = setup();

    await usecase.execute({ userIds: [USER_C], type: "registration.approved", params: {} });

    expect(notifications.items).toHaveLength(1);
    expect(provider.sent).toEqual([]);
    expect(tickets.items).toEqual([]);
  });

  it("does nothing without users and notifies a repeated user once", async () => {
    const { notifications, provider, usecase } = setup();

    await usecase.execute({ userIds: [], type: "registration.approved", params: {} });
    expect(notifications.items).toEqual([]);

    await usecase.execute({ userIds: [USER_B, USER_B], type: "registration.approved", params: {} });
    expect(notifications.items).toHaveLength(1);
    expect(provider.sent).toHaveLength(1);
  });

  it("removes an unregistered device and stores the tickets of the others", async () => {
    const { provider, tokens, tickets, usecase } = setup();
    provider.ticketsByToken["ExpoPushToken[a1]"] = {
      status: "error",
      details: { error: "DeviceNotRegistered" },
    };
    provider.ticketsByToken["ExpoPushToken[a2]"] = { status: "ok", id: "r2" };

    await usecase.execute({ userIds: [USER_A], type: "registration.approved", params: {} });

    expect(tokens.tokens()).toEqual(["ExpoPushToken[a2]", "ExpoPushToken[b1]"]);
    expect(tickets.items).toEqual([{ id: "r2", token: "ExpoPushToken[a2]", createdAt: NOW }]);
  });

  it("keeps the token and stores no ticket for any other error", async () => {
    const { provider, tokens, tickets, usecase } = setup();
    provider.ticketsByToken["ExpoPushToken[a1]"] = { status: "error", details: { error: "MessageRateExceeded" } };
    provider.ticketsByToken["ExpoPushToken[a2]"] = { status: "error" };

    await usecase.execute({ userIds: [USER_A], type: "registration.approved", params: {} });

    expect(tokens.tokens()).toHaveLength(3);
    expect(tickets.items).toEqual([]);
  });

  it("keeps the stored notifications and propagates when the push fails", async () => {
    const { notifications, provider, usecase } = setup();
    provider.sendError = new Error("expo down");

    await expect(
      usecase.execute({ userIds: [USER_A], type: "registration.approved", params: {} }),
    ).rejects.toThrow("expo down");
    expect(notifications.items).toHaveLength(1);
  });

  it("sends nothing when storing fails", async () => {
    const { notifications, provider, usecase } = setup();
    notifications.failWith = new Error("db down");

    await expect(
      usecase.execute({ userIds: [USER_A], type: "registration.approved", params: {} }),
    ).rejects.toThrow("db down");
    expect(provider.sent).toEqual([]);
  });

  it("validates the notification before storing it", async () => {
    const { notifications, usecase } = setup();

    await expect(
      usecase.execute({ userIds: ["not-a-uuid"], type: "registration.approved", params: {} }),
    ).rejects.toThrow();
    expect(notifications.items).toEqual([]);
  });
});

