import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AddressPlace,
  AddressSuggestion,
  AddressSuggestionProvider,
  SuggestionLanguage,
} from '@rochas-surf-school/classes';

const PLACES_URL = 'https://places.googleapis.com/v1';
const REQUEST_TIMEOUT_MS = 5000;
// Suggestions lean towards Fortaleza: a circle of 50 km around its centre.
const BIAS_CENTER = { latitude: -3.7319, longitude: -38.5267 };
const BIAS_RADIUS_METERS = 50_000;
const PLACE_FIELDS = 'formattedAddress,location,displayName';

interface AutocompleteResponse {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
    };
  }[];
}

interface PlaceResponse {
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  displayName?: { text?: string };
}

/**
 * Address suggestions and places from Google Places API (New). Failures (a non-2xx answer, the network) reject, for the
 * use case to answer 502; an unknown place is `null`. Without the key outside production it answers nothing.
 */
@Injectable()
export class GooglePlacesAddressSuggestionProvider implements AddressSuggestionProvider {
  private readonly logger = new Logger(GooglePlacesAddressSuggestionProvider.name);
  private readonly apiKey?: string;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      if (configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('GOOGLE_MAPS_API_KEY is not configured');
      }
      this.logger.warn(
        'GOOGLE_MAPS_API_KEY is not set: address suggestions are empty, so locations are typed and placed by hand',
      );
      return;
    }

    this.apiKey = apiKey;
  }

  async suggest(query: {
    query: string;
    sessionToken: string;
    language: SuggestionLanguage;
  }): Promise<AddressSuggestion[]> {
    if (!this.apiKey) return [];

    const response = await fetch(`${PLACES_URL}/places:autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': this.apiKey },
      body: JSON.stringify({
        input: query.query,
        sessionToken: query.sessionToken,
        languageCode: query.language,
        locationBias: { circle: { center: BIAS_CENTER, radius: BIAS_RADIUS_METERS } },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Google Places autocomplete answered ${response.status}`);
    }

    const body = (await response.json()) as AutocompleteResponse;
    const items: AddressSuggestion[] = [];

    for (const suggestion of body.suggestions ?? []) {
      const prediction = suggestion.placePrediction;
      const title = prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text;

      if (prediction?.placeId && title) {
        items.push({
          placeId: prediction.placeId,
          title,
          description: prediction.structuredFormat?.secondaryText?.text ?? '',
        });
      }
    }

    return items;
  }

  async findPlace(query: {
    placeId: string;
    sessionToken: string;
    language: SuggestionLanguage;
  }): Promise<AddressPlace | null> {
    if (!this.apiKey) return null;

    const params = new URLSearchParams({
      sessionToken: query.sessionToken,
      languageCode: query.language,
    });
    const response = await fetch(
      `${PLACES_URL}/places/${encodeURIComponent(query.placeId)}?${params.toString()}`,
      {
        headers: { 'X-Goog-Api-Key': this.apiKey, 'X-Goog-FieldMask': PLACE_FIELDS },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`Google Places details answered ${response.status}`);
    }

    const body = (await response.json()) as PlaceResponse;
    const { formattedAddress, location, displayName } = body;

    if (
      !formattedAddress ||
      typeof location?.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      return null;
    }

    return {
      address: formattedAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      name: displayName?.text ?? '',
    };
  }
}
