import { ForbiddenError } from "@rochas-surf-school/shared";
import { ListRemovedAccounts, User, UserState } from "../../../src";
import { FakeClockProvider, FakeUserRepository } from "../../mock";

const NOW = new Date("2026-10-30T12:00:00.000Z");
const ADMIN = { id: "admin-id", role: "admin", status: "approved" } as const;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function buildUser(overrides: Partial<UserState> = {}): User {
  return new User({
    name: "Ana Souza",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status: "removed",
    ...overrides,
  });
}

function setup(users: User[]) {
  const useCase = new ListRemovedAccounts(
    new FakeUserRepository(users),
    new FakeClockProvider(NOW),
  );

  return { useCase };
}

describe("ListRemovedAccounts", () => {
  test("lists the removed accounts inside the window, most recent removal first", async () => {
    const r1 = buildUser({ name: "Bia", role: "instructor", removedAt: new Date(NOW.getTime() - 2 * DAY) });
    const r2 = buildUser({ name: "Caio", removedAt: new Date(NOW.getTime() - HOUR) });
    const r3 = buildUser({ removedAt: new Date(NOW.getTime() - 30 * DAY - 60_000) });
    const deleted = buildUser({ status: "deleted", removedAt: new Date(NOW.getTime() - HOUR) });
    const approved = buildUser({ status: "approved" });
    const { useCase } = setup([r1, r3, deleted, approved, r2]);

    await expect(useCase.execute({ actor: ADMIN })).resolves.toEqual({
      items: [
        { id: r2.id, name: "Caio", role: "student", whatsappNumber: null, removedAt: r2.removedAt?.toISOString() },
        { id: r1.id, name: "Bia", role: "instructor", whatsappNumber: null, removedAt: r1.removedAt?.toISOString() },
      ],
    });
  });

  test("breaks ties by id", async () => {
    const removedAt = new Date(NOW.getTime() - DAY);
    const a = buildUser({ removedAt });
    const b = buildUser({ removedAt });
    const { useCase } = setup([a, b]);

    const { items } = await useCase.execute({ actor: ADMIN });

    expect(items.map((item) => item.id)).toEqual([a.id, b.id].sort());
  });

  test("never lists an account removed exactly 30 days ago or without a date", async () => {
    const edge = buildUser({ removedAt: new Date(NOW.getTime() - 30 * DAY) });
    const undated = buildUser();
    const { useCase } = setup([edge, undated]);

    await expect(useCase.execute({ actor: ADMIN })).resolves.toEqual({ items: [] });
  });

  test("answers an empty list when nobody was removed", async () => {
    const { useCase } = setup([]);

    await expect(useCase.execute({ actor: ADMIN })).resolves.toEqual({ items: [] });
  });

  test("refuses a caller that isn't approved", async () => {
    const { useCase } = setup([]);

    await expect(useCase.execute({ actor: { ...ADMIN, status: "removed" } })).rejects.toThrow(
      new ForbiddenError("user.status.notApproved"),
    );
  });

  test("refuses an approved non-admin", async () => {
    const { useCase } = setup([]);

    await expect(useCase.execute({ actor: { ...ADMIN, role: "instructor" } })).rejects.toThrow(
      new ForbiddenError("user.role.notAdmin"),
    );
  });

  it("gives the admin the WhatsApp number even when its owner doesn't share it", async () => {
    const hidden = buildUser({
      whatsappNumber: "+5585999998888",
      whatsappVisible: false,
      removedAt: new Date(NOW.getTime() - HOUR),
    });
    const { useCase } = setup([hidden]);

    const { items } = await useCase.execute({ actor: ADMIN });

    expect(items[0]?.whatsappNumber).toBe("+5585999998888");
  });
});
