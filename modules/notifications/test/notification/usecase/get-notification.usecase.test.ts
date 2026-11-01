import { NotFoundError, ValidationException } from "@rochas-surf-school/shared";
import { GetNotification, MessageSender, Notification } from "../../../src";
import {
  FakeMessageSenderReader,
  FakeNotificationRepository,
  USER_A,
  USER_B,
  USER_C,
} from "../../mock";

const ANA: MessageSender = {
  id: USER_C,
  name: "Ana Souza",
  photoUrl: null,
  role: "admin",
  status: "approved",
  whatsappNumber: "+5585999999999",
  whatsappVisible: false,
};
const CREATED_AT = new Date("2026-10-12T12:00:00.000Z");
const MISSING = "44444444-4444-4444-8444-444444444444";

async function setup() {
  const repository = new FakeNotificationRepository();
  const own = new Notification({
    userId: USER_A,
    type: "broadcast",
    params: { title: "Aviso", message: "Tragam protetor.", senderId: USER_C },
    createdAt: CREATED_AT,
  });
  const other = new Notification({ userId: USER_B, type: "class.deleted", params: {} });
  await repository.createMany([own, other]);

  return {
    own,
    other,
    repository,
    useCase: new GetNotification(repository, new FakeMessageSenderReader([ANA])),
  };
}

describe("GetNotification", () => {
  it("answers the caller's notification in the shape of the list, in pt-BR by default", async () => {
    const { own, useCase } = await setup();

    const out = await useCase.execute({ userId: USER_A, notificationId: own.id, viewerIsAdmin: false });

    expect(out).toEqual({
      item: {
        id: own.id,
        type: "broadcast",
        params: own.params,
        createdAt: CREATED_AT.toISOString(),
        read: false,
        adminMessage: {
          title: "Aviso",
          text: "Tragam protetor.",
          sender: { id: USER_C, name: "Ana Souza", photoUrl: null, role: "admin", whatsappNumber: null },
        },
      },
      locale: "pt-BR",
    });
  });

  it("follows the WhatsApp rule for an admin and answers the locale asked", async () => {
    const { own, useCase } = await setup();

    const out = await useCase.execute({
      userId: USER_A,
      notificationId: own.id,
      viewerIsAdmin: true,
      locale: "es",
    });

    expect(out.locale).toBe("es");
    expect(out.item.adminMessage?.sender?.whatsappNumber).toBe("+5585999999999");
  });

  it("doesn't mark it read", async () => {
    const { own, repository, useCase } = await setup();

    await useCase.execute({ userId: USER_A, notificationId: own.id, viewerIsAdmin: false });

    expect(repository.items.find((item) => item.id === own.id)?.readAt).toBeNull();
  });

  it("answers notification.notFound for a malformed id, an unknown one and someone else's", async () => {
    const { other, useCase } = await setup();

    for (const notificationId of ["not-a-uuid", "", MISSING, other.id]) {
      const error = await useCase
        .execute({ userId: USER_A, notificationId, viewerIsAdmin: false })
        .catch((caught) => caught);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toMatchObject({ message: "notification.notFound" });
    }
  });

  it("refuses an invalid locale", async () => {
    const { own, useCase } = await setup();

    const error = (await useCase
      .execute({ userId: USER_A, notificationId: own.id, viewerIsAdmin: false, locale: "fr" })
      .catch((caught) => caught)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toEqual(["notifications.locale.invalid"]);
  });
});
