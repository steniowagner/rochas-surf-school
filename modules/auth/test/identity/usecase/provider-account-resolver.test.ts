import { ValidationException } from "@rochas-surf-school/shared";
import { Identity, User, UserState } from "../../../src";
import { ProviderAccountResolver } from "../../../src/identity/usecase/provider-account-resolver";
import {
  FakeIdentityRepository,
  FakeRegistrationNotifier,
  FakeUserRepository,
} from "../../mock";

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

function setup(options: { users?: User[]; identities?: Identity[] } = {}) {
  const userRepository = new FakeUserRepository(options.users ?? []);
  const identityRepository = new FakeIdentityRepository(options.identities ?? []);
  const notifier = new FakeRegistrationNotifier();
  const resolver = new ProviderAccountResolver(userRepository, identityRepository, notifier);
  return { identityRepository, notifier, resolver, userRepository };
}

function input(overrides = {}) {
  return {
    provider: "apple" as const,
    sub: "sub-1",
    email: "maria@example.com",
    bodyName: undefined,
    ...overrides,
  };
}

describe("ProviderAccountResolver", () => {
  describe("findByIdentity", () => {
    test("answers the identity's account", async () => {
      const ana = buildUser();
      const identity = new Identity({
        userId: ana.id,
        provider: "apple",
        providerUserId: "sub-1",
      });
      const ctx = setup({ users: [ana], identities: [identity] });

      expect((await ctx.resolver.findByIdentity("apple", "sub-1"))?.id).toBe(ana.id);
    });

    test("the same sub of another provider is no identity", async () => {
      const ana = buildUser();
      const identity = new Identity({
        userId: ana.id,
        provider: "google",
        providerUserId: "sub-1",
      });
      const ctx = setup({ users: [ana], identities: [identity] });

      expect(await ctx.resolver.findByIdentity("apple", "sub-1")).toBeNull();
    });

    test("no identity, or one whose account is gone, answers null", async () => {
      const orphan = new Identity({
        userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        provider: "apple",
        providerUserId: "sub-1",
      });
      const ctx = setup({ identities: [orphan] });

      expect(await ctx.resolver.findByIdentity("apple", "sub-1")).toBeNull();
      expect(await ctx.resolver.findByIdentity("apple", "sub-2")).toBeNull();
    });
  });

  describe("linkOrCreate", () => {
    test("links an account with the same email, keeping its name and telling no admin", async () => {
      const ana = buildUser();
      const ctx = setup({ users: [ana] });

      const user = await ctx.resolver.linkOrCreate(
        input({ email: "ana@example.com", bodyName: "Someone Else" }),
      );

      expect(user.id).toBe(ana.id);
      expect(user.name).toBe("Ana Rocha");
      expect(ctx.userRepository.users).toHaveLength(1);
      expect(ctx.identityRepository.identities[0]).toMatchObject({
        userId: ana.id,
        provider: "apple",
        providerUserId: "sub-1",
        email: "ana@example.com",
      });
      expect(ctx.notifier.pending).toEqual([]);
    });

    test("creates a pending student with an identity and tells the admins", async () => {
      const ctx = setup();

      const user = await ctx.resolver.linkOrCreate(input({ bodyName: "  Maria Silva " }));

      expect(user).toMatchObject({
        name: "Maria Silva",
        email: "maria@example.com",
        role: "student",
        status: "pending",
      });
      expect(ctx.identityRepository.identities[0]).toMatchObject({
        userId: user.id,
        provider: "apple",
        providerUserId: "sub-1",
      });
      expect(ctx.notifier.pending).toEqual([{ id: user.id, name: "Maria Silva" }]);
    });

    test("the body name wins over the provider's, which is the fallback", async () => {
      const ctx = setup();

      const chosen = await ctx.resolver.linkOrCreate(
        input({ bodyName: "Maria Souza", providerName: "Maria Silva" }),
      );
      const fallback = await ctx.resolver.linkOrCreate(
        input({ sub: "sub-2", email: "joao@example.com", bodyName: 42, providerName: "Joao Lima" }),
      );

      expect(chosen.name).toBe("Maria Souza");
      expect(fallback.name).toBe("Joao Lima");
    });

    test("no valid name refuses and writes nothing", async () => {
      const ctx = setup();

      await expect(ctx.resolver.linkOrCreate(input())).rejects.toBeInstanceOf(
        ValidationException,
      );

      expect(ctx.userRepository.users).toHaveLength(0);
      expect(ctx.identityRepository.identities).toHaveLength(0);
      expect(ctx.notifier.pending).toEqual([]);
    });
  });
});
