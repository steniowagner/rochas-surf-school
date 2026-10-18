import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GooglePlacesAddressSuggestionProvider } from './google-places.address-suggestions.js';

const fetchMock = vi.fn();

function config(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function provider(values: Record<string, string> = { GOOGLE_MAPS_API_KEY: 'test-key' }) {
  return new GooglePlacesAddressSuggestionProvider(config(values));
}

function respond(status: number, body: unknown = {}) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

const SUGGEST = { query: 'praia do fut', sessionToken: 'abc123', language: 'pt-BR' as const };
const PLACE_QUERY = { placeId: 'ChIJ/abc', sessionToken: 'abc123', language: 'es' as const };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('GooglePlacesAddressSuggestionProvider', () => {
  describe('suggest', () => {
    it('posts the text with the key, the session token, the language and the Fortaleza bias', async () => {
      respond(200, { suggestions: [] });

      await provider().suggest(SUGGEST);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://places.googleapis.com/v1/places:autocomplete');
      expect(init.method).toBe('POST');
      expect(init.headers['X-Goog-Api-Key']).toBe('test-key');
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(JSON.parse(init.body)).toEqual({
        input: 'praia do fut',
        sessionToken: 'abc123',
        languageCode: 'pt-BR',
        locationBias: {
          circle: { center: { latitude: -3.7319, longitude: -38.5267 }, radius: 50000 },
        },
      });
    });

    it('maps the place predictions, using the structured format when there is one', async () => {
      respond(200, {
        suggestions: [
          {
            placePrediction: {
              placeId: 'p1',
              text: { text: 'Praia do Futuro, Fortaleza' },
              structuredFormat: {
                mainText: { text: 'Praia do Futuro' },
                secondaryText: { text: 'Fortaleza - CE' },
              },
            },
          },
          { placePrediction: { placeId: 'p2', text: { text: 'Praia de Iracema' } } },
          { queryPrediction: { text: { text: 'praia' } } },
          { placePrediction: { placeId: 'p3' } },
        ],
      });

      expect(await provider().suggest(SUGGEST)).toEqual([
        { placeId: 'p1', title: 'Praia do Futuro', description: 'Fortaleza - CE' },
        { placeId: 'p2', title: 'Praia de Iracema', description: '' },
      ]);
    });

    it('answers nothing when Google has no suggestions key', async () => {
      respond(200, {});

      expect(await provider().suggest(SUGGEST)).toEqual([]);
    });

    it('rejects on a non-2xx answer and on a network error', async () => {
      respond(403);
      await expect(provider().suggest(SUGGEST)).rejects.toThrow('403');

      fetchMock.mockRejectedValueOnce(new Error('offline'));
      await expect(provider().suggest(SUGGEST)).rejects.toThrow('offline');
    });
  });

  describe('findPlace', () => {
    it('gets the place with the field mask, the key, the session token and the language', async () => {
      respond(200, {
        formattedAddress: 'Av. Zezé Diogo, 5000 - Fortaleza',
        location: { latitude: -3.7442, longitude: -38.4617 },
        displayName: { text: 'Praia do Futuro' },
      });

      const place = await provider().findPlace(PLACE_QUERY);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(
        'https://places.googleapis.com/v1/places/ChIJ%2Fabc?sessionToken=abc123&languageCode=es',
      );
      expect(init.headers).toEqual({
        'X-Goog-Api-Key': 'test-key',
        'X-Goog-FieldMask': 'formattedAddress,location,displayName',
      });
      expect(place).toEqual({
        address: 'Av. Zezé Diogo, 5000 - Fortaleza',
        latitude: -3.7442,
        longitude: -38.4617,
        name: 'Praia do Futuro',
      });
    });

    it('uses an empty name when Google sends none', async () => {
      respond(200, { formattedAddress: 'Rua A', location: { latitude: 1, longitude: 2 } });

      expect((await provider().findPlace(PLACE_QUERY))?.name).toBe('');
    });

    it('answers null for an unknown place and for an answer without an address or a point', async () => {
      respond(404);
      respond(200, { location: { latitude: 1, longitude: 2 } });
      respond(200, { formattedAddress: 'Rua A' });
      respond(200, { formattedAddress: 'Rua A', location: { latitude: 1 } });

      expect(await provider().findPlace(PLACE_QUERY)).toBeNull();
      expect(await provider().findPlace(PLACE_QUERY)).toBeNull();
      expect(await provider().findPlace(PLACE_QUERY)).toBeNull();
      expect(await provider().findPlace(PLACE_QUERY)).toBeNull();
    });

    it('rejects on any other non-2xx answer and on a network error', async () => {
      respond(500);
      await expect(provider().findPlace(PLACE_QUERY)).rejects.toThrow('500');

      fetchMock.mockRejectedValueOnce(new Error('offline'));
      await expect(provider().findPlace(PLACE_QUERY)).rejects.toThrow('offline');
    });
  });

  describe('without GOOGLE_MAPS_API_KEY', () => {
    it('answers no suggestions and no place, calls nobody and logs once', async () => {
      const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const keyless = provider({});

      expect(await keyless.suggest(SUGGEST)).toEqual([]);
      expect(await keyless.findPlace(PLACE_QUERY)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('stops the backend in production', () => {
      expect(() => provider({ NODE_ENV: 'production' })).toThrow('GOOGLE_MAPS_API_KEY');
    });
  });
});
