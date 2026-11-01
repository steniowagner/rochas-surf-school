import { ValidationException } from "@rochas-surf-school/shared";
import { ListNotifications, MessageSender, Notification } from "../../../src";
import {
  FakeMessageSenderReader,
  FakeNotificationRepository,
  minutesAgo,
  NOW,
  USER_A,
  USER_B,
  USER_C,
} from "../../mock";

const ANA: MessageSender = {
  id: USER_C,
  name: "Ana Souza",
  photoUrl: "https://photos.test/ana.jpg",
  role: "admin",
  status: "approved",
  whatsappNumber: "+5585999999999",
  whatsappVisible: true,
};

const CALLER = { userId: USER_A, viewerIsAdmin: false };

function notification(userId: string, minutes: number, overrides: Partial<ConstructorParameters<typeof Notification>[0]> = {}) {
  return new Notification({
    userId,
    type: "enrolment.approved",
    params: { classId: "c-1", discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" },
    createdAt: minutesAgo(minutes),
    ...overrides,
  });
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("ListNotifications", () => {
  let repository: FakeNotificationRepository;
  let useCase: ListNotifications;

  beforeEach(async () => {
    repository = new FakeNotificationRepository();
    useCase = new ListNotifications(repository, new FakeMessageSenderReader());
  });

  it("answers the caller's 20 newest notifications first, then the rest, never another user's", async () => {
    const own = Array.from({ length: 25 }, (_, index) => notification(USER_A, index));
    await repository.createMany([...own].reverse());
    await repository.createMany([0, 1, 2].map((minutes) => notification(USER_B, minutes)));

    const first = await useCase.execute({ ...CALLER, locale: "en" });
    const second = await useCase.execute({ ...CALLER, page: "2", locale: "en" });

    expect(first.page).toBe(1);
    expect(first.perPage).toBe(20);
    expect(first.total).toBe(25);
    expect(first.locale).toBe("en");
    expect(first.items.map((item) => item.id)).toEqual(own.slice(0, 20).map((item) => item.id));
    expect(second.items.map((item) => item.id)).toEqual(own.slice(20).map((item) => item.id));
  });

  it("maps each notification to its id, type, params, ISO creation time and read state", async () => {
    const unread = notification(USER_A, 1);
    const read = notification(USER_A, 2, {
      type: "class.deleted",
      params: { discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" },
      readAt: NOW,
    });
    await repository.createMany([unread, read]);

    const result = await useCase.execute(CALLER);

    expect(result.items).toEqual([
      {
        id: unread.id,
        type: "enrolment.approved",
        params: { classId: "c-1", discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" },
        createdAt: minutesAgo(1).toISOString(),
        read: false,
        adminMessage: null,
      },
      {
        id: read.id,
        type: "class.deleted",
        params: { discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" },
        createdAt: minutesAgo(2).toISOString(),
        read: true,
        adminMessage: null,
      },
    ]);
  });

  it("answers an empty page for a user without notifications, in pt-BR by default", async () => {
    expect(await useCase.execute({ ...CALLER, userId: USER_C })).toEqual({
      items: [],
      page: 1,
      perPage: 20,
      total: 0,
      locale: "pt-BR",
    });
  });

  it.each(["pt-BR", "es", "en"])("accepts the locale %s", async (locale) => {
    expect((await useCase.execute({ ...CALLER, locale })).locale).toBe(locale);
  });

  it("accepts a perPage from 1 to 50", async () => {
    expect((await useCase.execute({ ...CALLER, perPage: "1" })).perPage).toBe(1);
    expect((await useCase.execute({ ...CALLER, perPage: "50" })).perPage).toBe(50);
  });

  it("lists every invalid query field in one error", async () => {
    expect(
      await errorsOf(useCase.execute({ ...CALLER, page: "0", perPage: "51", locale: "fr" })),
    ).toEqual([
      "notifications.page.invalid",
      "notifications.perPage.invalid",
      "notifications.locale.invalid",
    ]);
  });

  it.each([
    [{ page: "abc" }, "notifications.page.invalid"],
    [{ page: "-1" }, "notifications.page.invalid"],
    [{ page: "1.5" }, "notifications.page.invalid"],
    [{ page: ["1", "2"] as unknown as string }, "notifications.page.invalid"],
    [{ perPage: "0" }, "notifications.perPage.invalid"],
    [{ perPage: "" }, "notifications.perPage.invalid"],
    [{ locale: "" }, "notifications.locale.invalid"],
    [{ locale: "pt" }, "notifications.locale.invalid"],
  ])("rejects %p", async (query, key) => {
    expect(await errorsOf(useCase.execute({ ...CALLER, ...query }))).toEqual([key]);
  });

  describe("admin messages", () => {
    function adminMessage(params: Record<string, unknown>, type: "broadcast" | "class.message" = "broadcast") {
      return notification(USER_A, 1, { type, params: { title: "Aviso", message: "Tragam protetor.", ...params } });
    }

    async function firstAdminMessage(
      senders: MessageSender[],
      params: Record<string, unknown>,
      viewerIsAdmin = false,
    ) {
      await repository.createMany([adminMessage(params)]);
      const list = new ListNotifications(repository, new FakeMessageSenderReader(senders));
      const { items } = await list.execute({ ...CALLER, viewerIsAdmin });

      return items[0].adminMessage;
    }

    it.each(["broadcast", "class.message"] as const)("answers the text of a %s with its sender", async (type) => {
      await repository.createMany([adminMessage({ senderId: USER_C }, type)]);
      const list = new ListNotifications(repository, new FakeMessageSenderReader([ANA]));

      const { items } = await list.execute(CALLER);

      expect(items[0].adminMessage).toEqual({
        title: "Aviso",
        text: "Tragam protetor.",
        sender: {
          id: USER_C,
          name: "Ana Souza",
          photoUrl: "https://photos.test/ana.jpg",
          role: "admin",
          whatsappNumber: "+5585999999999",
        },
      });
    });

    it("answers sender null with no senderId, for a message stored before senders were kept", async () => {
      expect(await firstAdminMessage([ANA], {})).toEqual({
        title: "Aviso",
        text: "Tragam protetor.",
        sender: null,
      });
    });

    it("answers sender null when the senderId isn't a text", async () => {
      expect((await firstAdminMessage([ANA], { senderId: 42 }))?.sender).toBeNull();
    });

    it("answers sender null, with the text, for an account that was erased or doesn't exist", async () => {
      expect(await firstAdminMessage([], { senderId: USER_C })).toEqual({
        title: "Aviso",
        text: "Tragam protetor.",
        sender: null,
      });
    });

    it("reads each sender once, in one read per page", async () => {
      await repository.createMany([
        adminMessage({ senderId: USER_C }),
        adminMessage({ senderId: USER_C }, "class.message"),
        adminMessage({ senderId: USER_B }),
        adminMessage({}),
        notification(USER_A, 2, { params: { senderId: USER_A } }),
      ]);
      const reader = new FakeMessageSenderReader([ANA]);

      await new ListNotifications(repository, reader).execute(CALLER);

      expect(reader.calls).toHaveLength(1);
      expect([...reader.calls[0]].sort()).toEqual([USER_B, USER_C]);
    });

    it("reads no sender for a page without any", async () => {
      await repository.createMany([notification(USER_A, 1), adminMessage({})]);
      const reader = new FakeMessageSenderReader([ANA]);

      await new ListNotifications(repository, reader).execute(CALLER);

      expect(reader.calls).toEqual([]);
    });

    describe("the sender's WhatsApp number", () => {
      const numberFor = async (sender: Partial<MessageSender>, viewerIsAdmin: boolean) =>
        (await firstAdminMessage([{ ...ANA, ...sender }], { senderId: USER_C }, viewerIsAdmin))?.sender
          ?.whatsappNumber;

      it("shows a shared number to everyone", async () => {
        expect(await numberFor({}, false)).toBe("+5585999999999");
      });

      it("hides an unshared number from everyone but an admin", async () => {
        expect(await numberFor({ whatsappVisible: false }, false)).toBeNull();
      });

      it("shows an unshared number to an admin", async () => {
        expect(await numberFor({ whatsappVisible: false }, true)).toBe("+5585999999999");
      });

      it("answers null to everyone for a sender with no number", async () => {
        expect(await numberFor({ whatsappNumber: null }, true)).toBeNull();
      });

      it("answers null to everyone for a sender who isn't approved any more", async () => {
        expect(await numberFor({ status: "deleted" }, true)).toBeNull();
      });
    });
  });
});
