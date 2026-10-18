import { Notify, NotifyClassesWithoutInstructor } from "../../../src";
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

const INPUT = {
  count: 2,
  classId: "9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47",
  discipline: "surf" as const,
  startsAt: new Date("2026-10-18T11:00:00.000Z"),
  excludeUserIds: [USER_C],
};

const PARAMS = {
  count: 2,
  classId: INPUT.classId,
  discipline: "surf",
  startsAt: "2026-10-18T11:00:00.000Z",
};

function setup(adminIds: string[]) {
  const notifications = new FakeNotificationRepository();
  const provider = new FakePushProvider();
  const notify = new Notify(
    notifications,
    new FakePushTokenRepository([
      pushToken("ExpoPushToken[a]", USER_A, "pt-BR"),
      pushToken("ExpoPushToken[c]", USER_C, "en"),
    ]),
    new FakePushTicketRepository(),
    provider,
    new FakeClockProvider(NOW),
  );
  return {
    notifications,
    provider,
    usecase: new NotifyClassesWithoutInstructor(new FakeRecipientsProvider(adminIds), notify),
  };
}

describe("NotifyClassesWithoutInstructor", () => {
  it("notifies every approved admin except the excluded ones", async () => {
    const { notifications, provider, usecase } = setup([USER_A, USER_B, USER_C]);

    await usecase.execute(INPUT);

    expect(notifications.items.map((item) => [item.userId, item.type, item.params])).toEqual([
      [USER_A, "class.noInstructor", PARAMS],
      [USER_B, "class.noInstructor", PARAMS],
    ]);
    expect(provider.sent.map((message) => message.token)).toEqual(["ExpoPushToken[a]"]);
  });

  it("stores and sends nothing when the excluded admins are the only ones", async () => {
    const { notifications, provider, usecase } = setup([USER_C]);

    await usecase.execute(INPUT);

    expect(notifications.items).toEqual([]);
    expect(provider.sent).toEqual([]);
  });

  it("stores and sends nothing with no approved admin", async () => {
    const { notifications, provider, usecase } = setup([]);

    await usecase.execute({ ...INPUT, excludeUserIds: [] });

    expect(notifications.items).toEqual([]);
    expect(provider.sent).toEqual([]);
  });
});
