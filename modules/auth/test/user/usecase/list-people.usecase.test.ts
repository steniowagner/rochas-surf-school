import { ForbiddenError, ValidationException } from "@rochas-surf-school/shared";
import { ListPeople, ListPeopleIn, User, UserRole, UserStatus } from "../../../src";
import { FakeUserRepository } from "../../mock";

interface BuildOptions {
  photoUrl?: string;
  status?: UserStatus;
  role?: UserRole;
  createdAt?: string;
  whatsappNumber?: string;
  whatsappVisible?: boolean;
  isInstructor?: boolean;
}

function buildUser(name: string, options: BuildOptions = {}): User {
  return new User({
    name,
    photoUrl: options.photoUrl,
    email: `${name.replace(/\s/g, "").toLowerCase()}@example.com`,
    whatsappNumber: options.whatsappNumber,
    whatsappVisible: options.whatsappVisible ?? false,
    role: options.role ?? "student",
    status: options.status ?? "approved",
    isInstructor: options.isInstructor,
    createdAt: new Date(options.createdAt ?? "2026-09-01T10:00:00.000Z"),
  });
}

const student = { id: "viewer", role: "student", status: "approved" } as const;
const admin = { id: "admin", role: "admin", status: "approved" } as const;

function run(users: User[], input: Partial<ListPeopleIn> = {}) {
  return new ListPeople(new FakeUserRepository(users)).execute({ actor: student, ...input });
}

async function errorKeys(input: Partial<ListPeopleIn>): Promise<string[]> {
  try {
    await run([], input);
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
  return [];
}

describe("ListPeople", () => {
  test("carries each person's photo", async () => {
    const photoUrl = "https://cdn.example.com/ana.jpg";

    const { items } = await run([buildUser("Ana Silva", { photoUrl })]);

    expect(items[0].photoUrl).toBe(photoUrl);
  });

  test("lists only approved users with exactly the directory fields", async () => {
    const ana = buildUser("Ana Silva", {
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
      createdAt: "2026-09-02T10:00:00.000Z",
    });
    const users = [
      ana,
      buildUser("Pending", { status: "pending" }),
      buildUser("Denied", { status: "denied" }),
      buildUser("Deleted", { status: "deleted" }),
      buildUser("Removed", { status: "removed" }),
    ];

    await expect(run(users)).resolves.toEqual({
      items: [
        {
          id: ana.id,
          name: "Ana Silva",
          photoUrl: null,
          role: "student",
          isInstructor: false,
          createdAt: "2026-09-02T10:00:00.000Z",
          whatsappNumber: "+5585999998888",
        },
      ],
      page: 1,
      perPage: 20,
      total: 1,
    });
  });

  test("answers a null number for a user without one", async () => {
    const result = await run([buildUser("Ana", { whatsappVisible: true })], { });

    expect(result.items[0].whatsappNumber).toBeNull();
  });

  test("hides unshared numbers from a non-admin, the caller's own included", async () => {
    const shared = buildUser("Shared", { whatsappNumber: "+5585911112222", whatsappVisible: true });
    const hidden = buildUser("Hidden", { whatsappNumber: "+5585933334444" });

    const result = await run([shared, hidden]);

    expect(result.items.map((item) => item.whatsappNumber).sort((a, b) => String(a).localeCompare(String(b)))).toEqual([
      "+5585911112222",
      null,
    ]);
  });

  test("shows every number to an admin, and null for who has none", async () => {
    const hidden = buildUser("Hidden", { whatsappNumber: "+5585933334444" });
    const none = buildUser("None");

    const result = await run([hidden, none], { actor: admin });

    expect(result.items.find((item) => item.id === hidden.id)?.whatsappNumber).toBe(
      "+5585933334444",
    );
    expect(result.items.find((item) => item.id === none.id)?.whatsappNumber).toBeNull();
  });

  test("filters by role and by name ignoring case and accents", async () => {
    const users = [
      buildUser("João Pinto"),
      buildUser("Joana Rocha", { role: "instructor" }),
      buildUser("Ana Silva"),
    ];

    expect((await run(users, { search: "joao" })).items.map((i) => i.name)).toEqual(["João Pinto"]);
    expect((await run(users, { search: "JOA" })).total).toBe(2);
    expect(
      (await run(users, { role: "student", search: "jo" })).items.map((i) => i.name),
    ).toEqual(["João Pinto"]);
    expect((await run(users, { role: "instructor" })).items.map((i) => i.name)).toEqual([
      "Joana Rocha",
    ]);
  });

  test("filters by users that have at least one of the comma-separated roles", async () => {
    const users = [
      buildUser("Ana", { role: "student" }),
      buildUser("Bia", { role: "instructor" }),
      buildUser("Caio", { role: "admin" }),
    ];

    const names = async (role: string) => (await run(users, { role })).items.map((i) => i.name);

    expect(await names("student,instructor")).toEqual(["Ana", "Bia"]);
    expect(await names(" admin , student,admin")).toEqual(["Ana", "Caio"]);
    expect(await names("")).toEqual(["Ana", "Bia", "Caio"]);
    expect(await names(",")).toEqual(["Ana", "Bia", "Caio"]);
  });

  test("rejects an unknown role in the list and a repeated parameter", async () => {
    expect(await errorKeys({ role: "student,guest" })).toEqual(["people.role.invalid"]);
    expect(await errorKeys({ role: ["student", "admin"] as unknown as string })).toEqual([
      "people.role.invalid",
    ]);
  });

  test("answers the stored instructor flag on every item", async () => {
    const users = [
      buildUser("Ana", { role: "admin", isInstructor: true }),
      buildUser("Bia", { role: "admin" }),
      buildUser("Caio", { role: "instructor" }),
    ];

    const result = await run(users);

    expect(result.items.map((item) => [item.name, item.isInstructor])).toEqual([
      ["Ana", true],
      ["Bia", false],
      ["Caio", false],
    ]);
  });

  describe("teaches", () => {
    const users = [
      buildUser("Ivo Instrutor", { role: "instructor" }),
      buildUser("Fabi Flag", { role: "admin", isInstructor: true }),
      buildUser("Nina Nao", { role: "admin" }),
      buildUser("Saulo Aluno", { role: "student" }),
      buildUser("Paulo Pendente", { role: "instructor", status: "pending" }),
    ];
    const names = async (input: Partial<ListPeopleIn>) =>
      (await run(users, input)).items.map((item) => item.name);

    test("lists only approved instructors and admins with the flag", async () => {
      expect(await names({ teaches: "true" })).toEqual(["Fabi Flag", "Ivo Instrutor"]);
      expect((await run(users, { teaches: "true" })).total).toBe(2);
    });

    test("combines with role and search", async () => {
      expect(await names({ teaches: "true", role: "admin" })).toEqual(["Fabi Flag"]);
      expect(await names({ teaches: "true", search: "ivo" })).toEqual(["Ivo Instrutor"]);
    });

    test("is ignored when absent", async () => {
      expect(await names({})).toHaveLength(4);
    });

    test.each(["false", "1", ""])("rejects %j", async (teaches) => {
      expect(await errorKeys({ teaches })).toEqual(["people.teaches.invalid"]);
    });

    test("rejects a repeated parameter", async () => {
      expect(await errorKeys({ teaches: ["true", "true"] as unknown as string })).toEqual([
        "people.teaches.invalid",
      ]);
    });
  });

  test("trims the search and treats a blank one as none", async () => {
    const users = [buildUser("João Pinto"), buildUser("Ana Silva")];

    expect((await run(users, { search: "   " })).total).toBe(2);
    expect((await run(users, { search: "  joao " })).total).toBe(1);
    expect((await run(users, { search: "zzzz" }))).toMatchObject({ items: [], total: 0 });
  });

  test("sorts A–Z by name ignoring case and accents", async () => {
    const users = [buildUser("Bruno"), buildUser("ana"), buildUser("Álvaro")];

    expect((await run(users)).items.map((i) => i.name)).toEqual(["Álvaro", "ana", "Bruno"]);
  });

  test("pages 20 at a time by default and honors page and perPage", async () => {
    const users = Array.from({ length: 25 }, (_, index) =>
      buildUser(`User ${index}`, {
        createdAt: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
      }),
    );

    const first = await run(users);
    expect(first).toMatchObject({ page: 1, perPage: 20, total: 25 });
    expect(first.items).toHaveLength(20);
    expect((await run(users, { page: "2" })).items).toHaveLength(5);
    expect((await run(users, { perPage: "50" })).items).toHaveLength(25);
    expect((await run(users, { page: "3" }))).toMatchObject({ items: [], total: 25 });
  });

  test("breaks ties by id so pages never overlap", async () => {
    const users = [buildUser("Same"), buildUser("Same"), buildUser("Same")];

    const first = await run(users, { perPage: "2" });
    const second = await run(users, { perPage: "2", page: "2" });
    const ids = [...first.items, ...second.items].map((item) => item.id);

    expect(new Set(ids).size).toBe(3);
  });

  test.each(["pending", "denied", "deleted", "removed"] as const)(
    "refuses a %s account before validating",
    async (status) => {
      const repository = new FakeUserRepository([]);
      const spy = jest.spyOn(repository, "findDirectoryPage");

      await expect(
        new ListPeople(repository).execute({
          actor: { id: "x", role: "admin", status },
          page: "0",
        }),
      ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
      expect(spy).not.toHaveBeenCalled();
    },
  );

  test("collects every invalid parameter into one validation error, in order", async () => {
    expect(
      await errorKeys({
        page: "0",
        perPage: "51",
        role: "guest",
        search: "a".repeat(81),
      }),
    ).toEqual([
      "people.page.invalid",
      "people.perPage.invalid",
      "people.role.invalid",
      "people.search.max.length",
    ]);
  });

  test.each(["abc", "1.5", "-1", ""])("rejects the non-integer page %j", async (page) => {
    expect(await errorKeys({ page })).toEqual(["people.page.invalid"]);
    expect(await errorKeys({ perPage: page })).toEqual(["people.perPage.invalid"]);
  });

  test("rejects a repeated query parameter (an array) and accepts an 80-character search", async () => {
    expect(await errorKeys({ page: ["1", "2"] as unknown as string })).toEqual([
      "people.page.invalid",
    ]);
    expect(await errorKeys({ search: "a".repeat(80) })).toEqual([]);
    expect(await errorKeys({ search: ["a", "b"] as unknown as string })).toEqual([]);
  });
});
