export type SuggestionLanguage = "pt-BR" | "es" | "en";

export interface AddressSuggestion {
  placeId: string;
  title: string;
  description: string;
}

export interface AddressPlace {
  address: string;
  latitude: number;
  longitude: number;
  name: string;
}

export interface AddressSuggestionProvider {
  /** At most 5 suggestions for the text the admin typed. Rejects when the provider fails. */
  suggest(query: {
    query: string;
    sessionToken: string;
    language: SuggestionLanguage;
  }): Promise<AddressSuggestion[]>;
  /** The place behind a suggestion; `null` when the provider doesn't know it. Rejects when the provider fails. */
  findPlace(query: {
    placeId: string;
    sessionToken: string;
    language: SuggestionLanguage;
  }): Promise<AddressPlace | null>;
}
