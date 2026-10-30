import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListReactivationRequests, User, UserState } from "../../../src";
import {
  FakeClassesTakenCounter,
  FakeClockProvider,
  FakeUserRepository,
} from "../../mock";

const NOW = new Date("2026-10-26T12:00:00.000Z");
const admin = { id: "admin-id", role: "admin", status: "approved" } as const;

function buildUser(name: string, overrides: Partial<UserState> = {}): User {
  return new User({
    name,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    whatsappVisible: false,
    role: "student",
    status: "deleted",
    ...overrides,
  });
}

function requested(name: string, requestedAt: string, overrides: Partial<UserState> = {}): User {
  return buildUser(name, {
    reactivationStatus: "requested",
    reactivationRequestedAt: new Date(requestedAt),
    deletedAt: new Date("2026-10-01T08:00:00.000Z"),
    ...overrides,
  });
}

function setup(users: User[], taken: Record<string, number> = {}) {
  const counter = new FakeClassesTakenCounter(taken);
  const useCase = new ListReactivationRequests(
    new FakeUserRepository(users),
    counter,
    new FakeClockProvider(NOW),
  );

  return { counter, useCase };
}

describe("ListReactivationRequests", () => {
  test("lists only the requested reactivations, oldest first, with classes taken", async () => {
    const ana = requested("Ana Souza", "2026-10-10T10:00:00.000Z", { role: "instructor" });
    const bia = requested("Bia Lima", "2026-10-05T10:00:00.000Z");
    const users = [
      ana,
      buildUser("Carla Dias"),
      buildUser("Davi Reis", { reactivationStatus: "denied" }),
      buildUser("Eva Lins", { status: "approved" }),
      bia,
    ];
    const { counter, useCase } = setup(users, { [ana.id]: 2 });

    const out = await useCase.execute({ actor: admin });

    expect(out.items).toEqual([
      {
        id: bia.id,
        name: "Bia Lima",
        photoUrl: null,
        email: "bia@example.com",
        role: "student",
        deletedAt: "2026-10-01T08:00:00.000Z",
        requestedAt: "2026-10-05T10:00:00.000Z",
        classesTaken: 0,
      },
      {
        id: ana.id,
        name: "Ana Souza",
        photoUrl: null,
        email: "ana@example.com",
        role: "instructor",
        deletedAt: "2026-10-01T08:00:00.000Z",
        requestedAt: "2026-10-10T10:00:00.000Z",
        classesTaken: 2,
      },
    ]);
    expect(counter.calls).toEqual([{ userIds: [bia.id, ana.id], now: NOW }]);
  });

  test("falls back to the last update when a date is missing", async () => {
    const legacy = buildUser("Fabio Melo", { reactivationStatus: "requested" });
    const { useCase } = setup([legacy]);

    const out = await useCase.execute({ actor: admin });

    expect(out.items[0].deletedAt).toBe(legacy.updatedAt.toISOString());
    expect(out.items[0].requestedAt).toBe(legacy.updatedAt.toISOString());
  });

  test("answers an empty list without counting", async () => {
    const { counter, useCase } = setup([buildUser("Carla Dias")]);

    await expect(useCase.execute({ actor: admin })).resolves.toEqual({ items: [] });
    expect(counter.calls).toEqual([]);
  });

  test("counts 0 for an id the counter left out", async () => {
    const ana = requested("Ana Souza", "2026-10-10T10:00:00.000Z");
    const counter = { countTaken: async () => ({}) };
    const useCase = new ListReactivationRequests(
      new FakeUserRepository([ana]),
      counter,
      new FakeClockProvider(NOW),
    );

    const out = await useCase.execute({ actor: admin });

    expect(out.items[0].classesTaken).toBe(0);
  });

  test("refuses a pending admin and a non-admin", async () => {
    const { useCase } = setup([]);

    await expect(
      useCase.execute({ actor: { id: "a", role: "admin", status: "pending" } }),
    ).rejects.toThrow(new ForbiddenError("user.status.notApproved"));
    await expect(
      useCase.execute({ actor: { id: "a", role: "student", status: "approved" } }),
    ).rejects.toThrow(new ForbiddenError("user.role.notAdmin"));
  });
});
