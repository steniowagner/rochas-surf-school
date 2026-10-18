import {
  BadGatewayError,
  ForbiddenError,
  NotFoundError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { FindAddressPlace, SuggestAddresses } from "../../../src";
import { ADMIN, FakeAddressSuggestionProvider, INSTRUCTOR, STUDENT } from "../../mock";

const PLACE = {
  address: "Av. Zezé Diogo, 5000 – Fortaleza",
  latitude: -3.7442,
  longitude: -38.4617,
  name: "Praia do Futuro",
};

function suggestion(index: number) {
  return { placeId: `p${index}`, title: `Praia ${index}`, description: "Fortaleza" };
}

async function errorsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = (await promise.catch((e) => e)) as ValidationException;
  expect(error).toBeInstanceOf(ValidationException);
  return error.errors.map((item) => item.message);
}

describe("SuggestAddresses (suggest)", () => {
  it("asks the provider with the trimmed text, the token and the language, and answers at most 5", async () => {
    const provider = new FakeAddressSuggestionProvider();
    provider.suggestions = [1, 2, 3, 4, 5, 6, 7].map(suggestion);

    const out = await new SuggestAddresses(provider).execute({
      actor: ADMIN,
      query: "  praia do fut ",
      sessionToken: "abc123",
      language: "es",
    });

    expect(out.items).toEqual([1, 2, 3, 4, 5].map(suggestion));
    expect(provider.suggestCalls).toEqual([{ query: "praia do fut", sessionToken: "abc123", language: "es" }]);
  });

  it.each([[undefined], ["fr"], [5]])("falls back to pt-BR for the language %s", async (language) => {
    const provider = new FakeAddressSuggestionProvider();

    await new SuggestAddresses(provider).execute({ actor: ADMIN, query: "praia", sessionToken: "t", language });

    expect(provider.suggestCalls[0].language).toBe("pt-BR");
  });

  it.each([
    [{ query: "ab", sessionToken: "t" }, ["location.suggestions.query.invalid"]],
    [{ query: "  ab ", sessionToken: "t" }, ["location.suggestions.query.invalid"]],
    [{ query: "a".repeat(101), sessionToken: "t" }, ["location.suggestions.query.invalid"]],
    [{ query: undefined, sessionToken: "t" }, ["location.suggestions.query.invalid"]],
    [{ query: "praia", sessionToken: "" }, ["location.suggestions.sessionToken.invalid"]],
    [{ query: "praia", sessionToken: "a".repeat(65) }, ["location.suggestions.sessionToken.invalid"]],
    [{ query: "praia", sessionToken: "a b" }, ["location.suggestions.sessionToken.invalid"]],
    [{ query: "praia", sessionToken: undefined }, ["location.suggestions.sessionToken.invalid"]],
    [
      { query: "", sessionToken: "!" },
      ["location.suggestions.query.invalid", "location.suggestions.sessionToken.invalid"],
    ],
  ])("refuses %j without calling the provider", async (body, keys) => {
    const provider = new FakeAddressSuggestionProvider();

    expect(await errorsOf(new SuggestAddresses(provider).execute({ actor: ADMIN, ...body }))).toEqual(keys);
    expect(provider.suggestCalls).toHaveLength(0);
  });

  it("accepts the limits", async () => {
    const provider = new FakeAddressSuggestionProvider();
    const useCase = new SuggestAddresses(provider);

    await useCase.execute({ actor: ADMIN, query: "abc", sessionToken: "a".repeat(64) });
    await useCase.execute({ actor: ADMIN, query: "a".repeat(100), sessionToken: "A_z-9" });

    expect(provider.suggestCalls).toHaveLength(2);
  });

  it("answers 502 when the provider fails", async () => {
    const provider = new FakeAddressSuggestionProvider();
    provider.fail = true;

    const error = await new SuggestAddresses(provider)
      .execute({ actor: ADMIN, query: "praia", sessionToken: "t" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadGatewayError);
    expect(error.message).toBe("location.suggestions.unavailable");
  });

  it("refuses accounts that are not approved admins", async () => {
    const provider = new FakeAddressSuggestionProvider();
    const useCase = new SuggestAddresses(provider);
    const input = { query: "praia", sessionToken: "t" };

    const pending = await useCase.execute({ actor: { ...ADMIN, status: "pending" }, ...input }).catch((e) => e);
    const student = await useCase.execute({ actor: STUDENT, ...input }).catch((e) => e);
    const instructor = await useCase.execute({ actor: INSTRUCTOR, ...input }).catch((e) => e);

    expect(pending).toBeInstanceOf(ForbiddenError);
    expect(pending.message).toBe("user.status.notApproved");
    expect(student.message).toBe("user.role.notAdmin");
    expect(instructor.message).toBe("user.role.notAdmin");
    expect(provider.suggestCalls).toHaveLength(0);
  });
});

describe("FindAddressPlace (place)", () => {
  it("answers the place behind a suggestion", async () => {
    const provider = new FakeAddressSuggestionProvider();
    provider.places.set("p1", PLACE);

    const out = await new FindAddressPlace(provider).execute({
      actor: ADMIN,
      placeId: "p1",
      sessionToken: "abc123",
      language: "en",
    });

    expect(out).toEqual(PLACE);
    expect(provider.findPlaceCalls).toEqual([{ placeId: "p1", sessionToken: "abc123", language: "en" }]);
  });

  it("falls back to pt-BR for an unknown language", async () => {
    const provider = new FakeAddressSuggestionProvider();
    provider.places.set("p1", PLACE);

    await new FindAddressPlace(provider).execute({ actor: ADMIN, placeId: "p1", sessionToken: "t" });

    expect(provider.findPlaceCalls[0].language).toBe("pt-BR");
  });

  it("refuses a malformed session token", async () => {
    const provider = new FakeAddressSuggestionProvider();

    expect(
      await errorsOf(new FindAddressPlace(provider).execute({ actor: ADMIN, placeId: "p1", sessionToken: "a b" })),
    ).toEqual(["location.suggestions.sessionToken.invalid"]);
    expect(provider.findPlaceCalls).toHaveLength(0);
  });

  it.each([["unknown"], [""], [undefined]])("answers 404 for the place %j", async (placeId) => {
    const error = await new FindAddressPlace(new FakeAddressSuggestionProvider())
      .execute({ actor: ADMIN, placeId, sessionToken: "t" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe("location.place.notFound");
  });

  it("answers 502 when the provider fails", async () => {
    const provider = new FakeAddressSuggestionProvider();
    provider.fail = true;

    const error = await new FindAddressPlace(provider)
      .execute({ actor: ADMIN, placeId: "p1", sessionToken: "t" })
      .catch((e) => e);

    expect(error).toBeInstanceOf(BadGatewayError);
    expect(error.message).toBe("location.suggestions.unavailable");
  });

  it("refuses accounts that are not approved admins", async () => {
    const provider = new FakeAddressSuggestionProvider();
    const useCase = new FindAddressPlace(provider);
    const input = { placeId: "p1", sessionToken: "t" };

    const pending = await useCase.execute({ actor: { ...ADMIN, status: "pending" }, ...input }).catch((e) => e);
    const student = await useCase.execute({ actor: STUDENT, ...input }).catch((e) => e);

    expect(pending.message).toBe("user.status.notApproved");
    expect(student.message).toBe("user.role.notAdmin");
    expect(provider.findPlaceCalls).toHaveLength(0);
  });
});
