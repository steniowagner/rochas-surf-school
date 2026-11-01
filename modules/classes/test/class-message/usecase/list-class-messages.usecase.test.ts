import { ForbiddenError, NotFoundError } from "@rochas-surf-school/shared";
import { UserStatus } from "@rochas-surf-school/auth";
import { ClassActor, ClassMessage, ClassMessageSender, ListClassMessages } from "../../../src";
import {
  ADMIN,
  buildClass,
  FakeClassMessageRepository,
  FakeSchoolClassRepository,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const MISSING = "11111111-1111-4111-8111-111111111111";
const SENDER_ID = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";
const OLDER = new Date("2026-10-14T13:00:00.000Z");
const NEWER = new Date("2026-10-14T15:00:00.000Z");

const SENDER: ClassMessageSender = {
  id: SENDER_ID,
  name: "Ana Souza",
  photoUrl: "https://photos.test/ana.jpg",
  role: "admin",
  status: "approved",
  whatsappNumber: "+5585999999999",
  whatsappVisible: true,
};

interface Options {
  sender?: Partial<ClassMessageSender>;
  noSender?: boolean;
  stored?: Parameters<typeof buildClass>[0];
}

function setup(options: Options = {}) {
  const stored = buildClass(options.stored);
  const other = buildClass();
  const message = (classId: string, title: string, createdAt: Date) =>
    new ClassMessage({ classId, senderId: SENDER_ID, title, message: `${title} text`, createdAt });
  const repository = new FakeClassMessageRepository(
    [
      message(stored.id, "Older", OLDER),
      message(stored.id, "Newer", NEWER),
      message(other.id, "Another class", NEWER),
    ],
    options.noSender ? [] : [{ ...SENDER, ...options.sender }],
  );

  return {
    stored,
    useCase: new ListClassMessages(new FakeSchoolClassRepository([stored, other]), repository),
  };
}

async function numberFor(actor: ClassActor, sender: Partial<ClassMessageSender>) {
  const { useCase, stored } = setup({ sender });
  const { items } = await useCase.execute({ actor, id: stored.id });

  return items[0].sender?.whatsappNumber;
}

describe("ListClassMessages", () => {
  it("answers the class's messages, newest first, with their sender", async () => {
    const { useCase, stored } = setup();

    const out = await useCase.execute({ actor: ADMIN, id: stored.id });

    const sender = {
      id: SENDER_ID,
      name: "Ana Souza",
      photoUrl: "https://photos.test/ana.jpg",
      role: "admin",
      whatsappNumber: "+5585999999999",
    };
    expect(out.items).toEqual([
      { id: expect.any(String), title: "Newer", message: "Newer text", createdAt: NEWER, sender },
      { id: expect.any(String), title: "Older", message: "Older text", createdAt: OLDER, sender },
    ]);
  });

  it.each([[ADMIN], [INSTRUCTOR], [STUDENT]])("lets any approved role read: %j", async (actor) => {
    const { useCase, stored } = setup();

    const { items } = await useCase.execute({ actor, id: stored.id });

    expect(items).toHaveLength(2);
  });

  it("answers no items for a class with no messages", async () => {
    const stored = buildClass();
    const useCase = new ListClassMessages(
      new FakeSchoolClassRepository([stored]),
      new FakeClassMessageRepository(),
    );

    await expect(useCase.execute({ actor: STUDENT, id: stored.id })).resolves.toEqual({ items: [] });
  });

  it("still answers for a cancelled class", async () => {
    const { useCase, stored } = setup({ stored: { cancelledAt: OLDER } });

    const { items } = await useCase.execute({ actor: STUDENT, id: stored.id });

    expect(items).toHaveLength(2);
  });

  it.each<UserStatus>(["pending", "denied", "deleted", "removed"])(
    "refuses a %s account first",
    async (status) => {
      const { useCase } = setup();

      await expect(
        useCase.execute({ actor: { ...STUDENT, status }, id: "not-a-uuid" }),
      ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    },
  );

  it("answers class.notFound for a malformed or unknown id", async () => {
    const { useCase } = setup();

    for (const id of ["not-a-uuid", MISSING]) {
      const error = await useCase.execute({ actor: ADMIN, id }).catch((caught) => caught);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toMatchObject({ message: "class.notFound" });
    }
  });

  it("answers sender null when the account was erased, keeping the text", async () => {
    const { useCase, stored } = setup({ noSender: true });

    const { items } = await useCase.execute({ actor: ADMIN, id: stored.id });

    expect(items[0]).toMatchObject({ title: "Newer", message: "Newer text", sender: null });
  });

  describe("the sender's WhatsApp number", () => {
    it("shows a shared number to everyone", async () => {
      expect(await numberFor(STUDENT, {})).toBe("+5585999999999");
    });

    it("hides an unshared number from everyone but an admin", async () => {
      expect(await numberFor(STUDENT, { whatsappVisible: false })).toBeNull();
      expect(await numberFor(INSTRUCTOR, { whatsappVisible: false })).toBeNull();
      expect(await numberFor(ADMIN, { whatsappVisible: false })).toBe("+5585999999999");
    });

    it("answers null to everyone for a sender with no number", async () => {
      expect(await numberFor(ADMIN, { whatsappNumber: null })).toBeNull();
    });

    it("answers null to everyone for a sender who isn't approved any more", async () => {
      expect(await numberFor(ADMIN, { status: "deleted" })).toBeNull();
      expect(await numberFor(STUDENT, { status: "removed" })).toBeNull();
    });
  });
});
