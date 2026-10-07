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
