import { ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { CountBroadcastRecipients, Notify, SendBroadcast } from "../../../src";
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
  USER_C,
} from "../../mock";

const ADMIN = { id: USER_C, role: "admin", status: "approved" };

function setup() {
  const recipients = new FakeRecipientsProvider([USER_C], {
    all: [USER_A, USER_B, USER_C],
    students: [USER_A],
    instructors: [USER_B, USER_B],
  });
  const notifications = new FakeNotificationRepository();
  const provider = new FakePushProvider();
  const notify = new Notify(
    notifications,
    new FakePushTokenRepository([
      pushToken("ExpoPushToken[a1]", USER_A, "pt-BR"),
      pushToken("ExpoPushToken[a2]", USER_A, "en"),
      pushToken("ExpoPushToken[b1]", USER_B, "es"),
    ]),
    new FakePushTicketRepository(),
    provider,
    new FakeClockProvider(NOW),
  );
  return {
    notifications,
    provider,
    count: new CountBroadcastRecipients(recipients),
    send: new SendBroadcast(recipients, notify),
  };
}

describe("CountBroadcastRecipients", () => {
  it.each([
    ["all", 3],
    ["students", 1],
    ["instructors", 1],
  ])("counts the approved users of %s", async (audience, expected) => {
    const { count } = setup();

    expect(await count.execute({ actor: ADMIN, audience })).toEqual({ count: expected });
  });

  it.each([
    [{ ...ADMIN, role: "student" }],
    [{ ...ADMIN, role: "instructor" }],
    [{ ...ADMIN, status: "pending" }],
  ])("rejects an actor that is not an approved admin", async (actor) => {
    const { count } = setup();

    await expect(count.execute({ actor, audience: "all" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it.each([["everybody"], [undefined], [""]])("rejects the audience %p", async (audience) => {
    const { count } = setup();

    await expect(count.execute({ actor: ADMIN, audience })).rejects.toBeInstanceOf(
      ValidationException,
    );
  });
});

describe("SendBroadcast", () => {
  it("stores one broadcast per recipient, as written and trimmed, then pushes every phone", async () => {
    const { notifications, provider, send } = setup();

    await send.execute({
      actor: ADMIN,
      audience: "students",
      title: "  Aula <b>cancelada</b> ",
      message: " Sem aula 🌊 amanhã ",
    });

    expect(notifications.items.map((item) => [item.userId, item.type, item.params])).toEqual([
      [USER_A, "broadcast", { title: "Aula <b>cancelada</b>", message: "Sem aula 🌊 amanhã" }],
    ]);
    expect(provider.sent.map((message) => [message.token, message.locale, message.type])).toEqual([
      ["ExpoPushToken[a1]", "pt-BR", "broadcast"],
      ["ExpoPushToken[a2]", "en", "broadcast"],
    ]);
  });

  it("reaches the sender only when the audience is everyone", async () => {
    const { notifications, send } = setup();

    await send.execute({ actor: ADMIN, audience: "all", title: "t", message: "m" });
    expect(notifications.items.map((item) => item.userId)).toEqual([USER_A, USER_B, USER_C]);
  });

  it("deduplicates recipients", async () => {
    const { notifications, send } = setup();

    await send.execute({ actor: ADMIN, audience: "instructors", title: "t", message: "m" });

    expect(notifications.items.map((item) => item.userId)).toEqual([USER_B]);
  });

  it("stores and sends nothing for an audience with no recipients", async () => {
    const notifications = new FakeNotificationRepository();
    const provider = new FakePushProvider();
    const notify = new Notify(
      notifications,
      new FakePushTokenRepository(),
      new FakePushTicketRepository(),
      provider,
      new FakeClockProvider(NOW),
    );
    const send = new SendBroadcast(new FakeRecipientsProvider(), notify);

    await send.execute({ actor: ADMIN, audience: "students", title: "t", message: "m" });

    expect(notifications.items).toEqual([]);
    expect(provider.sent).toEqual([]);
  });

  it.each([
    [{ ...ADMIN, role: "student" }],
    [{ ...ADMIN, role: "instructor" }],
    [{ ...ADMIN, status: "pending" }],
  ])("rejects an actor that is not an approved admin", async (actor) => {
    const { notifications, send } = setup();

    await expect(
      send.execute({ actor, audience: "all", title: "t", message: "m" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(notifications.items).toEqual([]);
  });

  it.each([
    ["unknown audience", "everybody", "t", "m"],
    ["missing audience", undefined, "t", "m"],
    ["blank title", "all", "   ", "m"],
    ["missing title", "all", undefined, "m"],
    ["over-limit title", "all", "x".repeat(61), "m"],
    ["blank message", "all", "t", "  "],
    ["non-string message", "all", "t", 7],
    ["over-limit message", "all", "t", "x".repeat(501)],
  ])("rejects %s and stores nothing", async (_name, audience, title, message) => {
    const { notifications, provider, send } = setup();

    await expect(
      send.execute({ actor: ADMIN, audience, title, message }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(notifications.items).toEqual([]);
    expect(provider.sent).toEqual([]);
  });

  it("accepts the limits exactly", async () => {
    const { notifications, send } = setup();

    await send.execute({
      actor: ADMIN,
      audience: "students",
      title: "x".repeat(60),
      message: "y".repeat(500),
    });

    expect(notifications.items).toHaveLength(1);
  });
});
