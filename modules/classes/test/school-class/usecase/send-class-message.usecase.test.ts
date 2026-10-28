import {
  DomainError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { SendClassMessage } from "../../../src";
import {
  ADMIN,
  buildClass,
  FakeClassAudienceReader,
  FakeClassChangeNotifier,
  FakeClockProvider,
  FakeSchoolClassRepository,
  INSTRUCTOR,
  STUDENT,
} from "../../mock";

const NOW = new Date("2026-10-14T13:00:00.000Z"); // 10:00 in Fortaleza
const A = INSTRUCTOR.id;
const S1 = "8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b";
const S2 = "9f1a2b3c-4d5e-4f6a-8b7c-8d9e0f1a2b3c";
const MISSING = "11111111-1111-4111-8111-111111111111";

interface Options {
  now?: Date;
  stored?: Parameters<typeof buildClass>[0];
  audience?: string[];
  failNotifier?: boolean;
  failAudience?: boolean;
}

function setup(options: Options = {}) {
  const stored = buildClass({
    // Tomorrow, 08:00-09:00 in Fortaleza.
    instructorIds: [A],
    ...options.stored,
  });
  const classes = new FakeSchoolClassRepository([stored]);
  const changes = new FakeClassChangeNotifier();
  const audience = new FakeClassAudienceReader({ [stored.id]: options.audience ?? [S1] });
  audience.fail = options.failAudience ?? false;

  if (options.failNotifier) {
    changes.classMessage = async () => {
      throw new Error("notifier down");
    };
  }

  const useCase = new SendClassMessage(
    classes,
    audience,
    changes,
    new FakeClockProvider(options.now ?? NOW),
  );

  return {
    useCase,
    changes,
    stored,
    input: { actor: ADMIN, id: stored.id, title: "Aviso", message: "Tragam protetor." },
  };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error) => error,
  );
}

function messagesOf(error: unknown): string[] {
  return (error as ValidationException).errors.map((item) => item.message);
}

describe("SendClassMessage", () => {
  it("tells the instructors and the audience, with the trimmed title and message", async () => {
    const { useCase, input, changes, stored } = setup({ audience: [S1, S2] });

    await expect(
      useCase.execute({ ...input, title: "  Aviso  ", message: "  Tragam protetor.  " }),
    ).resolves.toBeUndefined();

    expect(changes.messageEvents).toEqual([
      {
        instructorIds: [A],
        studentIds: [S1, S2],
        classId: stored.id,
        discipline: "surf",
        startsAt: stored.startsAt,
        title: "Aviso",
        message: "Tragam protetor.",
      },
    ]);
  });

  it("sends to a started class, even at the exact start", async () => {
    const started = setup({ now: new Date("2026-10-15T11:30:00.000Z") });
    const atStart = setup({ now: new Date("2026-10-15T11:00:00.000Z") });

    await started.useCase.execute(started.input);
    await atStart.useCase.execute(atStart.input);

    expect(started.changes.messageEvents).toHaveLength(1);
    expect(atStart.changes.messageEvents).toHaveLength(1);
  });

  it("refuses a finished class, even at the exact end, and sends nothing", async () => {
    const { useCase, input, changes } = setup({ now: new Date("2026-10-15T12:00:00.000Z") });

    const error = await errorOf(useCase.execute(input));

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ message: "class.finished", statusCode: 409 });
    expect(changes.messageEvents).toEqual([]);
  });

  it("refuses a cancelled class with class.cancelled, even once finished", async () => {
    const { useCase, input, changes } = setup({
      now: new Date("2026-10-16T12:00:00.000Z"),
      stored: { cancelledAt: new Date("2026-10-13T10:00:00.000Z") },
    });

    const error = await errorOf(useCase.execute(input));

    expect(error).toMatchObject({ message: "class.cancelled", statusCode: 409 });
    expect(changes.messageEvents).toEqual([]);
  });

  it.each([[STUDENT], [INSTRUCTOR]])("checks access: %j is not an admin", async (actor) => {
    const { useCase, input, changes } = setup();

    const error = await errorOf(useCase.execute({ ...input, actor }));

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({ message: "user.role.notAdmin" });
    expect(changes.messageEvents).toEqual([]);
  });

  it("checks access: a non-approved admin is refused first", async () => {
    const { useCase, input } = setup();

    const error = await errorOf(
      useCase.execute({ ...input, actor: { ...ADMIN, status: "pending" }, id: "not-a-uuid" }),
    );

    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toMatchObject({ message: "user.status.notApproved" });
  });

  it("checks the id: an unknown or non-UUID id is class.notFound", async () => {
    const { useCase, input } = setup();

    for (const id of [MISSING, "not-a-uuid", 42 as unknown as string]) {
      const error = await errorOf(useCase.execute({ ...input, id }));

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error).toMatchObject({ message: "class.notFound" });
    }
  });

  it.each([
    [undefined, "class.message.title.required"],
    [null, "class.message.title.required"],
    ["   ", "class.message.title.required"],
    [42, "class.message.title.required"],
    ["t".repeat(61), "class.message.title.range.length"],
  ])("checks the title: %j is refused and nothing is sent", async (title, key) => {
    const { useCase, input, changes } = setup();

    const error = await errorOf(useCase.execute({ ...input, title }));

    expect(error).toBeInstanceOf(ValidationException);
    expect(messagesOf(error)).toEqual([key]);
    expect(changes.messageEvents).toEqual([]);
  });

  it.each([
    [undefined, "class.message.text.required"],
    ["", "class.message.text.required"],
    [{}, "class.message.text.required"],
    ["m".repeat(501), "class.message.text.range.length"],
  ])("checks the message: %j is refused and nothing is sent", async (message, key) => {
    const { useCase, input, changes } = setup();

    const error = await errorOf(useCase.execute({ ...input, message }));

    expect(error).toBeInstanceOf(ValidationException);
    expect(messagesOf(error)).toEqual([key]);
    expect(changes.messageEvents).toEqual([]);
  });

  it("reports a blank title and an over-limit message together", async () => {
    const { useCase, input } = setup();

    const error = await errorOf(useCase.execute({ ...input, title: "", message: "m".repeat(501) }));

    expect(messagesOf(error)).toEqual([
      "class.message.title.required",
      "class.message.text.range.length",
    ]);
  });

  it("accepts a title of 60 and a message of 500 characters once trimmed", async () => {
    const { useCase, input, changes } = setup();

    await useCase.execute({ ...input, title: ` ${"t".repeat(60)} `, message: ` ${"m".repeat(500)} ` });

    expect(changes.messageEvents[0]).toMatchObject({ title: "t".repeat(60), message: "m".repeat(500) });
  });

  it("checks the text before the state", async () => {
    const { useCase, input } = setup({ now: new Date("2026-10-16T12:00:00.000Z") });

    const error = await errorOf(useCase.execute({ ...input, title: "" }));

    expect(error).toBeInstanceOf(ValidationException);
  });

  it("never tells the sender, even when they teach the class or hold a seat", async () => {
    const { useCase, input, changes } = setup({
      stored: { instructorIds: [A, ADMIN.id] },
      audience: [ADMIN.id, S1],
    });

    await useCase.execute(input);

    expect(changes.messageEvents[0]).toMatchObject({ instructorIds: [A], studentIds: [S1] });
  });

  it("tells a person who teaches the class and is in the audience once, as an instructor", async () => {
    const { useCase, input, changes } = setup({ audience: [A, S1, S1] });

    await useCase.execute(input);

    expect(changes.messageEvents[0]).toMatchObject({ instructorIds: [A], studentIds: [S1] });
  });

  it("has no students to tell when the audience is empty", async () => {
    const { useCase, input, changes } = setup({ audience: [] });

    await useCase.execute(input);

    expect(changes.messageEvents).toHaveLength(1);
    expect(changes.messageEvents[0]).not.toHaveProperty("studentIds");
  });

  it("tells only the students when the sender is the only instructor", async () => {
    const { useCase, input, changes } = setup({ stored: { instructorIds: [ADMIN.id] } });

    await useCase.execute(input);

    expect(changes.messageEvents[0]).toMatchObject({ instructorIds: [], studentIds: [S1] });
  });

  it("answers and sends nothing when there is nobody to tell", async () => {
    const { useCase, input, changes } = setup({ stored: { instructorIds: [ADMIN.id] }, audience: [] });

    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(changes.messageEvents).toEqual([]);
  });

  it("tells the instructors only when the audience can't be read", async () => {
    const { useCase, input, changes } = setup({ failAudience: true });

    await useCase.execute(input);

    expect(changes.messageEvents[0]).toMatchObject({ instructorIds: [A] });
    expect(changes.messageEvents[0]).not.toHaveProperty("studentIds");
  });

  it("answers when the notifier fails", async () => {
    const { useCase, input } = setup({ failNotifier: true });

    await expect(useCase.execute(input)).resolves.toBeUndefined();
  });
});
