import {
  BadGatewayError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { AddressSuggestion, AddressSuggestionProvider } from "../provider";
import {
  SUGGESTION_QUERY_MAX,
  SUGGESTION_QUERY_MIN,
  SUGGESTION_RESULTS_MAX,
  isValidSessionToken,
  toSuggestionLanguage,
} from "./address-suggestion.rules";

export interface SuggestAddressesIn {
  actor: ClassActor;
  query: unknown;
  sessionToken: unknown;
  language?: unknown;
}

export interface SuggestAddressesOut {
  items: AddressSuggestion[];
}

export class SuggestAddresses implements UseCase<SuggestAddressesIn, SuggestAddressesOut> {
  constructor(private readonly provider: AddressSuggestionProvider) {}

  async execute(input: SuggestAddressesIn): Promise<SuggestAddressesOut> {
    assertCanManageClasses(input.actor);

    const query = typeof input.query === "string" ? input.query.trim() : "";
    const errors: string[] = [];

    if (query.length < SUGGESTION_QUERY_MIN || query.length > SUGGESTION_QUERY_MAX) {
      errors.push("location.suggestions.query.invalid");
    }

    if (!isValidSessionToken(input.sessionToken)) {
      errors.push("location.suggestions.sessionToken.invalid");
    }

    if (errors.length > 0) {
      throw new ValidationException(errors.map((key) => new ValidationError(key)));
    }

    try {
      const items = await this.provider.suggest({
        query,
        sessionToken: input.sessionToken as string,
        language: toSuggestionLanguage(input.language),
      });

      return { items: items.slice(0, SUGGESTION_RESULTS_MAX) };
    } catch {
      throw new BadGatewayError("location.suggestions.unavailable");
    }
  }
}
