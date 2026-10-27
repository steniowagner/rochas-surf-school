import { User, UserState } from "../../../src";
import { FakeUserRepository } from "../../mock";

function buildUser(overrides: Partial<UserState> = {}): User {
  return new User({
    name: "Ana Rocha",
    email: "ana@example.com",
    whatsappVisible: false,
    role: "student",
    status: "approved",
    ...overrides,
  });
}

describe("UserRepository.findByEmail (fake)", () => {
  test("returns the user with that email", async () => {
    const ana = buildUser();
    const bia = buildUser({ name: "Bia Souza", email: "bia@example.com" });
    const userRepository = new FakeUserRepository([ana, bia]);

    await expect(userRepository.findByEmail("bia@example.com")).resolves.toBe(bia);
  });

  test("returns null when no user has that email", async () => {
    const userRepository = new FakeUserRepository([buildUser()]);

    await expect(userRepository.findByEmail("carla@example.com")).resolves.toBeNull();
  });
});

describe("UserRepository.addRulesAcceptance (fake)", () => {
  const FIRST = new Date("2026-10-07T12:00:00.000Z");
  const LATER = new Date("2026-10-08T12:00:00.000Z");

  test("appends the acceptance and keeps the earlier ones", async () => {
    const ana = buildUser({ rulesAcceptances: [{ version: 1, acceptedAt: FIRST }] });
    const userRepository = new FakeUserRepository([ana]);

    await userRepository.addRulesAcceptance(ana.id, { version: 2, acceptedAt: LATER });

    const saved = await userRepository.findById(ana.id);
    expect(saved?.rulesAcceptances).toEqual([
      { version: 1, acceptedAt: FIRST },
      { version: 2, acceptedAt: LATER },
    ]);
  });

  test("keeps the first acceptedAt when the version is already stored", async () => {
    const ana = buildUser({ rulesAcceptances: [{ version: 2, acceptedAt: FIRST }] });
    const userRepository = new FakeUserRepository([ana]);

    await userRepository.addRulesAcceptance(ana.id, { version: 2, acceptedAt: LATER });

    const saved = await userRepository.findById(ana.id);
    expect(saved?.rulesAcceptances).toEqual([{ version: 2, acceptedAt: FIRST }]);
  });

  test("ignores an unknown user", async () => {
    const ana = buildUser();
    const userRepository = new FakeUserRepository([ana]);

    await userRepository.addRulesAcceptance("missing", { version: 1, acceptedAt: FIRST });

    expect(userRepository.users).toHaveLength(1);
    expect(ana.rulesAcceptances).toEqual([]);
  });
});

describe("UserRepository.findPending (fake)", () => {
  test("lists only pending users, oldest first", async () => {
    const newer = buildUser({
      name: "Bia Souza",
      email: "bia@example.com",
      status: "pending",
      createdAt: new Date("2026-10-02T10:00:00.000Z"),
    });
    const older = buildUser({
      status: "pending",
      createdAt: new Date("2026-10-01T10:00:00.000Z"),
    });
    const approved = buildUser({ name: "Carla Dias", email: "carla@example.com" });
    const userRepository = new FakeUserRepository([newer, approved, older]);

    await expect(userRepository.findPending()).resolves.toEqual([older, newer]);
  });
});

describe("UserRepository.updateIfPending (fake)", () => {
  test("writes a pending user and answers true", async () => {
    const ana = buildUser({ status: "pending" });
    const userRepository = new FakeUserRepository([ana]);
    const approved = ana.clone({ status: "approved" });

    await expect(userRepository.updateIfPending(approved)).resolves.toBe(true);
    await expect(userRepository.findById(ana.id)).resolves.toBe(approved);
  });

  test("keeps a user that is no longer pending and answers false", async () => {
    const ana = buildUser({ status: "denied" });
    const userRepository = new FakeUserRepository([ana]);

    await expect(
      userRepository.updateIfPending(ana.clone({ status: "approved" })),
    ).resolves.toBe(false);
    await expect(userRepository.findById(ana.id)).resolves.toBe(ana);
  });

  test("answers false for an unknown user", async () => {
    const userRepository = new FakeUserRepository([]);

    await expect(userRepository.updateIfPending(buildUser())).resolves.toBe(false);
  });
});

describe("UserRepository.findDeniedBefore / deleteDenied (fake)", () => {
  const CUTOFF = new Date("2026-10-07T12:00:00.000Z");
  const BEFORE = new Date("2026-10-07T11:59:00.000Z");
  const AFTER = new Date("2026-10-07T12:01:00.000Z");

  test("lists only denied users denied at or before the cutoff", async () => {
    const old = buildUser({ status: "denied", deniedAt: BEFORE });
    const exact = buildUser({ status: "denied", deniedAt: CUTOFF });
    const recent = buildUser({ status: "denied", deniedAt: AFTER });
    const undated = buildUser({ status: "denied" });
    const pending = buildUser({ status: "pending", deniedAt: BEFORE });
    const userRepository = new FakeUserRepository([old, exact, recent, undated, pending]);

    await expect(userRepository.findDeniedBefore(CUTOFF)).resolves.toEqual([old.id, exact.id]);
  });

  test("deletes only the given users that are still denied and counts them", async () => {
    const denied = buildUser({ status: "denied", deniedAt: BEFORE });
    const other = buildUser({ status: "denied", deniedAt: BEFORE });
    const approved = buildUser({ status: "approved" });
    const userRepository = new FakeUserRepository([denied, other, approved]);

    await expect(userRepository.deleteDenied([denied.id, approved.id])).resolves.toBe(1);

    expect(userRepository.users).toEqual([other, approved]);
  });
});

describe("UserRepository.countApprovedAdmins / updateKeepingAnAdmin (fake)", () => {
  const ADMIN = { role: "admin", status: "approved" } as const;

  test("counts only the approved admins", async () => {
    const userRepository = new FakeUserRepository([
      buildUser({ role: "admin" }),
      buildUser({ role: "admin", status: "deleted" }),
      buildUser({ role: "instructor" }),
      buildUser(),
    ]);

    await expect(userRepository.countApprovedAdmins()).resolves.toBe(1);
  });

  test("writes when the stored state is the expected one and another admin remains", async () => {
    const ana = buildUser({ role: "admin" });
    const userRepository = new FakeUserRepository([ana, buildUser({ role: "admin" })]);
    const demoted = ana.clone({ role: "instructor" });

    await expect(userRepository.updateKeepingAnAdmin(demoted, ADMIN)).resolves.toBe("updated");
    expect((await userRepository.findById(ana.id))?.role).toBe("instructor");
  });

  test("refuses to take away the last approved admin, by role or by status", async () => {
    const ana = buildUser({ role: "admin" });
    const userRepository = new FakeUserRepository([ana, buildUser({ role: "admin", status: "deleted" })]);

    await expect(
      userRepository.updateKeepingAnAdmin(ana.clone({ role: "instructor" }), ADMIN),
    ).resolves.toBe("lastAdmin");
    await expect(
      userRepository.updateKeepingAnAdmin(ana.clone({ status: "deleted" }), ADMIN),
    ).resolves.toBe("lastAdmin");
    expect(await userRepository.findById(ana.id)).toBe(ana);
  });

  test("writes a user who isn't an admin, or stays one, without the last-admin rule", async () => {
    const ana = buildUser({ role: "admin" });
    const bia = buildUser({ name: "Bia Souza" });
    const userRepository = new FakeUserRepository([ana, bia]);

    await expect(
      userRepository.updateKeepingAnAdmin(bia.clone({ role: "admin" }), { role: "student", status: "approved" }),
    ).resolves.toBe("updated");
    await expect(userRepository.updateKeepingAnAdmin(ana.clone({ name: "Ana R." }), ADMIN)).resolves.toBe(
      "updated",
    );
  });

  test("answers changed when the stored role or status isn't the expected one, or the user is gone", async () => {
    const ana = buildUser({ role: "instructor" });
    const userRepository = new FakeUserRepository([ana, buildUser({ role: "admin" })]);
    const promoted = ana.clone({ role: "admin" });

    await expect(
      userRepository.updateKeepingAnAdmin(promoted, { role: "student", status: "approved" }),
    ).resolves.toBe("changed");
    await expect(
      userRepository.updateKeepingAnAdmin(promoted, { role: "instructor", status: "pending" }),
    ).resolves.toBe("changed");
    await expect(
      userRepository.updateKeepingAnAdmin(buildUser(), { role: "student", status: "approved" }),
    ).resolves.toBe("changed");
    expect(await userRepository.findById(ana.id)).toBe(ana);
  });
});

describe("UserRepository reactivation requests (fake)", () => {
  const EARLY = new Date("2026-10-05T10:00:00.000Z");
  const LATE = new Date("2026-10-10T10:00:00.000Z");

  function deleted(overrides: Partial<UserState> = {}): User {
    return buildUser({ status: "deleted", ...overrides });
  }

  test("lists the deleted users with a requested reactivation, oldest request first", async () => {
    const late = deleted({ reactivationStatus: "requested", reactivationRequestedAt: LATE });
    const early = deleted({ reactivationStatus: "requested", reactivationRequestedAt: EARLY });
    const never = deleted();
    const denied = deleted({ reactivationStatus: "denied", reactivationRequestedAt: EARLY });
    const approved = buildUser({ reactivationStatus: "requested" });
    const userRepository = new FakeUserRepository([late, never, denied, approved, early]);

    const found = await userRepository.findReactivationRequests();

    expect(found.map((item) => item.id)).toEqual([early.id, late.id]);
  });

  test("breaks ties between equal request dates by id", async () => {
    const first = deleted({ reactivationStatus: "requested", reactivationRequestedAt: EARLY });
    const second = deleted({ reactivationStatus: "requested", reactivationRequestedAt: EARLY });
    const userRepository = new FakeUserRepository([first, second]);

    const found = await userRepository.findReactivationRequests();

    expect(found.map((item) => item.id)).toEqual([first.id, second.id].sort());
  });

  test("writes only while the stored user is deleted with a requested reactivation", async () => {
    const requested = deleted({ reactivationStatus: "requested", reactivationRequestedAt: EARLY });
    const decided = deleted({ reactivationStatus: "denied" });
    const userRepository = new FakeUserRepository([requested, decided]);

    await expect(
      userRepository.updateIfReactivationRequested(requested.clone({ status: "approved" })),
    ).resolves.toBe(true);
    await expect(
      userRepository.updateIfReactivationRequested(decided.clone({ status: "approved" })),
    ).resolves.toBe(false);
    await expect(
      userRepository.updateIfReactivationRequested(buildUser({ status: "approved" })),
    ).resolves.toBe(false);
    expect((await userRepository.findById(requested.id))?.status).toBe("approved");
    expect((await userRepository.findById(decided.id))?.status).toBe("deleted");
  });
});

describe("UserRepository.findRemovedSince / updateIfRemoved (fake)", () => {
  const CUTOFF = new Date("2026-10-07T12:00:00.000Z");
  const RECENT = new Date("2026-10-09T12:00:00.000Z");
  const NEWEST = new Date("2026-10-10T12:00:00.000Z");

  test("lists the removed users removed after the cutoff, newest first and ties by id", async () => {
    const newest = buildUser({ status: "removed", removedAt: NEWEST });
    const tieA = buildUser({ status: "removed", removedAt: RECENT });
    const tieB = buildUser({ status: "removed", removedAt: RECENT });
    const exact = buildUser({ status: "removed", removedAt: CUTOFF });
    const undated = buildUser({ status: "removed" });
    const deleted = buildUser({ status: "deleted", removedAt: RECENT });
    const userRepository = new FakeUserRepository([tieB, exact, undated, deleted, tieA, newest]);

    const found = await userRepository.findRemovedSince(CUTOFF);

    expect(found.map((item) => item.id)).toEqual([newest.id, ...[tieA.id, tieB.id].sort()]);
  });

  test("writes only while the stored user is still removed", async () => {
    const removed = buildUser({ status: "removed", removedAt: RECENT });
    const approved = buildUser();
    const userRepository = new FakeUserRepository([removed, approved]);

    await expect(userRepository.updateIfRemoved(removed.clone({ status: "approved" }))).resolves.toBe(
      true,
    );
    await expect(userRepository.updateIfRemoved(removed.clone({ status: "approved" }))).resolves.toBe(
      false,
    );
    await expect(userRepository.updateIfRemoved(approved)).resolves.toBe(false);
    await expect(userRepository.updateIfRemoved(buildUser({ status: "approved" }))).resolves.toBe(
      false,
    );
    expect((await userRepository.findById(removed.id))?.status).toBe("approved");
  });
});
