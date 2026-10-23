import { ValidationException } from "@rochas-surf-school/shared";
import { ListNotifications, Notification } from "../../../src";
import { FakeNotificationRepository, minutesAgo, NOW, USER_A, USER_B, USER_C } from "../../mock";

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
    useCase = new ListNotifications(repository);
  });

  it("answers the caller's 20 newest notifications first, then the rest, never another user's", async () => {
    const own = Array.from({ length: 25 }, (_, index) => notification(USER_A, index));
    await repository.createMany([...own].reverse());
    await repository.createMany([0, 1, 2].map((minutes) => notification(USER_B, minutes)));

    const first = await useCase.execute({ userId: USER_A, locale: "en" });
    const second = await useCase.execute({ userId: USER_A, page: "2", locale: "en" });

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

    const result = await useCase.execute({ userId: USER_A });

    expect(result.items).toEqual([
      {
        id: unread.id,
        type: "enrolment.approved",
        params: { classId: "c-1", discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" },
        createdAt: minutesAgo(1).toISOString(),
        read: false,
      },
      {
        id: read.id,
        type: "class.deleted",
        params: { discipline: "surf", startsAt: "2026-10-20T11:00:00.000Z" },
        createdAt: minutesAgo(2).toISOString(),
        read: true,
      },
    ]);
  });

  it("answers an empty page for a user without notifications, in pt-BR by default", async () => {
    expect(await useCase.execute({ userId: USER_C })).toEqual({
      items: [],
      page: 1,
      perPage: 20,
      total: 0,
      locale: "pt-BR",
    });
  });

  it.each(["pt-BR", "es", "en"])("accepts the locale %s", async (locale) => {
    expect((await useCase.execute({ userId: USER_A, locale })).locale).toBe(locale);
  });

  it("accepts a perPage from 1 to 50", async () => {
    expect((await useCase.execute({ userId: USER_A, perPage: "1" })).perPage).toBe(1);
    expect((await useCase.execute({ userId: USER_A, perPage: "50" })).perPage).toBe(50);
  });

  it("lists every invalid query field in one error", async () => {
    expect(
      await errorsOf(useCase.execute({ userId: USER_A, page: "0", perPage: "51", locale: "fr" })),
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
    expect(await errorsOf(useCase.execute({ userId: USER_A, ...query }))).toEqual([key]);
  });
});
