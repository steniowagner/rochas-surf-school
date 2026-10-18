import {
  BadGatewayError,
  NotFoundError,
  UseCase,
  ValidationError,
  ValidationException,
} from "@rochas-surf-school/shared";
import { ClassActor, assertCanManageClasses } from "../../access";
import { AddressPlace, AddressSuggestionProvider } from "../provider";
import { isValidSessionToken, toSuggestionLanguage } from "./address-suggestion.rules";

export interface FindAddressPlaceIn {
  actor: ClassActor;
  placeId: unknown;
  sessionToken: unknown;
  language?: unknown;
}

export class FindAddressPlace implements UseCase<FindAddressPlaceIn, AddressPlace> {
  constructor(private readonly provider: AddressSuggestionProvider) {}

  async execute(input: FindAddressPlaceIn): Promise<AddressPlace> {
    assertCanManageClasses(input.actor);

    if (!isValidSessionToken(input.sessionToken)) {
      throw new ValidationException([
        new ValidationError("location.suggestions.sessionToken.invalid"),
      ]);
    }

    if (typeof input.placeId !== "string" || input.placeId.trim() === "") {
      throw new NotFoundError("location.place.notFound");
    }

    let place: AddressPlace | null;

    try {
      place = await this.provider.findPlace({
        placeId: input.placeId,
        sessionToken: input.sessionToken,
        language: toSuggestionLanguage(input.language),
      });
    } catch {
      throw new BadGatewayError("location.suggestions.unavailable");
    }

    if (!place) {
      throw new NotFoundError("location.place.notFound");
    }

    return place;
  }
}
