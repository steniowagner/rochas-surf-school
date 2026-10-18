import {
  AddressPlace,
  AddressSuggestion,
  AddressSuggestionProvider,
  SuggestionLanguage,
} from "../../src";

export class FakeAddressSuggestionProvider implements AddressSuggestionProvider {
  readonly suggestCalls: { query: string; sessionToken: string; language: SuggestionLanguage }[] = [];
  readonly findPlaceCalls: { placeId: string; sessionToken: string; language: SuggestionLanguage }[] = [];
  suggestions: AddressSuggestion[] = [];
  places = new Map<string, AddressPlace>();
  fail = false;

  async suggest(query: {
    query: string;
    sessionToken: string;
    language: SuggestionLanguage;
  }): Promise<AddressSuggestion[]> {
    this.suggestCalls.push(query);
    if (this.fail) throw new Error("provider down");

    return this.suggestions;
  }

  async findPlace(query: {
    placeId: string;
    sessionToken: string;
    language: SuggestionLanguage;
  }): Promise<AddressPlace | null> {
    this.findPlaceCalls.push(query);
    if (this.fail) throw new Error("provider down");

    return this.places.get(query.placeId) ?? null;
  }
}
