import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListRegistrations, User, UserRole, UserStatus } from "../../../src";
import { FakeUserRepository } from "../../mock";

function buildUser(
  name: string,
  status: UserStatus,
  createdAt: string,
  role: UserRole = "student",
): User {
  return new User({
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    whatsappVisible: false,
    role,
    status,
    createdAt: new Date(createdAt),
  });
}

const admin = { id: "admin-id", role: "admin", status: "approved" } as const;

describe("ListRegistrations", () => {
  test("lists pending users of any role, oldest first, with the card's fields only", async () => {
    const bruno = buildUser(
      "Bruno Lima",
      "pending",
      "2026-10-02T10:00:00.000Z",
      "instructor",
    );
    const ana = buildUser("Ana Souza", "pending", "2026-10-01T10:00:00.000Z");
    const users = [
      bruno,
      buildUser("Carla Dias", "approved", "2026-09-01T10:00:00.000Z"),
      buildUser("Davi Reis", "denied", "2026-09-02T10:00:00.000Z"),
      buildUser("Eva Lins", "deleted", "2026-09-03T10:00:00.000Z"),
      buildUser("Fabio Melo", "removed", "2026-09-04T10:00:00.000Z"),
      ana,
    ];
    const useCase = new ListRegistrations(new FakeUserRepository(users));

    await expect(useCase.execute({ actor: admin })).resolves.toEqual({
      items: [
        {
          id: ana.id,
          name: "Ana Souza",
          photoUrl: null,
          email: "ana@example.com",
          createdAt: "2026-10-01T10:00:00.000Z",
        },
        {
          id: bruno.id,
          name: "Bruno Lima",
          photoUrl: null,
          email: "bruno@example.com",
          createdAt: "2026-10-02T10:00:00.000Z",
        },
      ],
    });
  });

  test("answers an empty list when no one is pending", async () => {
    const useCase = new ListRegistrations(new FakeUserRepository([]));

    await expect(useCase.execute({ actor: admin })).resolves.toEqual({
      items: [],
    });
  });

  test("refuses a non-admin before reading", async () => {
    const repository = new FakeUserRepository([]);
    const findPending = jest.spyOn(repository, "findPending");
    const useCase = new ListRegistrations(repository);

    await expect(
      useCase.execute({
        actor: { id: "x", role: "student", status: "approved" },
      }),
    ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
    expect(findPending).not.toHaveBeenCalled();
  });
});
