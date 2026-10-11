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
