import { SearchUsersByName, User, UserState } from "../../../src";
import { FakeUserRepository } from "../../mock";

function buildUser(name: string, overrides: Partial<UserState> = {}): User {
  return new User({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    whatsappVisible: false,
    role: "student",
    status: "approved",
    ...overrides,
  });
}

describe("SearchUsersByName", () => {
  test("returns the users whose name matches", async () => {
    const ana = buildUser("Ana Rocha");
    const bruno = buildUser("Bruno Lima");
    const mariana = buildUser("Mariana Souza");
    const userRepository = new FakeUserRepository([ana, bruno, mariana]);
    const useCase = new SearchUsersByName(userRepository);

    await expect(useCase.execute({ name: "ana" })).resolves.toEqual({
      users: [ana, mariana],
    });
    expect(userRepository.searchedNames).toEqual(["ana"]);
  });

  test("returns an empty list when no user matches", async () => {
    const userRepository = new FakeUserRepository([buildUser("Ana Rocha")]);
    const useCase = new SearchUsersByName(userRepository);

    await expect(useCase.execute({ name: "Carlos" })).resolves.toEqual({
      users: [],
    });
  });

  test("passes the name to the repository unchanged", async () => {
    const userRepository = new FakeUserRepository();
    const useCase = new SearchUsersByName(userRepository);

    await useCase.execute({ name: "  Ana " });

    expect(userRepository.searchedNames).toEqual(["  Ana "]);
  });

  test("propagates repository errors", async () => {
    const userRepository = new FakeUserRepository();
    const error = new Error("database unavailable");
    jest.spyOn(userRepository, "searchByName").mockRejectedValueOnce(error);
    const useCase = new SearchUsersByName(userRepository);

    await expect(useCase.execute({ name: "Ana" })).rejects.toBe(error);
  });
});
