import { ConfigService } from '@nestjs/config';
import { CancellationDeadlineRequest } from '@rochas-surf-school/classes';
import {
  AnthropicDeadlineDescriber,
  DEADLINE_MODEL,
  DEADLINE_SYSTEM_PROMPT,
} from './anthropic.deadline-describer.js';

const sdk = vi.hoisted(() => ({
  parse: vi.fn(),
  constructed: [] as unknown[],
}));

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {
    constructor(readonly status: number) {
      super('api error');
    }
  }
  class Anthropic {
    static APIError = APIError;
    beta = { messages: { parse: sdk.parse } };
    constructor(options: unknown) {
      sdk.constructed.push(options);
    }
  }
  return { default: Anthropic };
});

const REQUEST: CancellationDeadlineRequest = {
  rule: 'O aluno pode cancelar até 12 horas antes do início da aula.',
  class: {
    discipline: 'surf',
    level: 'beginner',
    date: '2026-10-20',
    weekday: 'Tuesday',
    start: '08:00',
    end: '09:00',
    locationName: 'Praia do Futuro',
    locationAddress: 'Av. Zezé Diogo, s/n',
    capacity: 8,
    notes: null,
  },
};

function config(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function answer(parsed: object | null, stopReason = 'end_turn') {
  sdk.parse.mockResolvedValue({ stop_reason: stopReason, parsed_output: parsed });
}

const FLAT = { minutes: null, days: null, time: null };

beforeEach(() => {
  sdk.parse.mockReset();
  sdk.constructed.length = 0;
});

describe('AnthropicDeadlineDescriber', () => {
  describe('request', () => {
    it('sends the SDK only the fixed system prompt and the JSON as the one user message', async () => {
      answer({ kind: 'classStart', ...FLAT });
      const describer = new AnthropicDeadlineDescriber(config({ ANTHROPIC_API_KEY: 'key' }));

      await describer.describe(REQUEST);

      expect(sdk.constructed).toEqual([{ apiKey: 'key', timeout: 30_000, maxRetries: 0 }]);
      expect(sdk.parse).toHaveBeenCalledTimes(1);
      const params = sdk.parse.mock.calls[0][0];
      expect(params).toMatchObject({
        model: DEADLINE_MODEL,
        max_tokens: 4096,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: DEADLINE_SYSTEM_PROMPT,
        output_config: { effort: 'low', format: expect.objectContaining({ type: 'json_schema' }) },
      });
      expect(DEADLINE_MODEL).toBe('claude-opus-5-5');
      expect(params.messages).toEqual([{ role: 'user', content: JSON.stringify(REQUEST) }]);
      expect(JSON.parse(params.messages[0].content)).toEqual(REQUEST);
    });
  });

  describe('answers', () => {
    const describer = () => new AnthropicDeadlineDescriber(config({ ANTHROPIC_API_KEY: 'key' }));

    it.each([
      [{ kind: 'minutesBefore', minutes: 720, days: null, time: null }, { kind: 'minutesBefore', minutes: 720 }],
      [
        { kind: 'daysBeforeAt', minutes: null, days: 1, time: '18:00' },
        { kind: 'daysBeforeAt', days: 1, time: '18:00' },
      ],
      [{ kind: 'classStart', ...FLAT }, { kind: 'classStart' }],
      [{ kind: 'unclear', ...FLAT }, { kind: 'unclear' }],
      [{ kind: 'minutesBefore', ...FLAT }, { kind: 'unclear' }],
      [{ kind: 'daysBeforeAt', minutes: null, days: 1, time: null }, { kind: 'unclear' }],
      [{ kind: 'daysBeforeAt', minutes: null, days: null, time: '18:00' }, { kind: 'unclear' }],
    ])('maps %j to %j', async (parsed, expected) => {
      answer(parsed);

      expect(await describer().describe(REQUEST)).toEqual(expected);
    });

    it('answers unclear for a refusal', async () => {
      answer(null, 'refusal');

      expect(await describer().describe(REQUEST)).toEqual({ kind: 'unclear' });
    });

    it('answers unclear when the answer did not parse', async () => {
      answer(null);

      expect(await describer().describe(REQUEST)).toEqual({ kind: 'unclear' });
    });

    it('answers unclear when there is no answer and no stop reason', async () => {
      sdk.parse.mockResolvedValue({ stop_reason: null, parsed_output: null });

      expect(await describer().describe(REQUEST)).toEqual({ kind: 'unclear' });
    });

    it('answers unclear on an API error and on a network error', async () => {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      sdk.parse.mockRejectedValueOnce(new Anthropic.APIError(529 as never, undefined, undefined, undefined as never));
      sdk.parse.mockRejectedValueOnce(new Error('socket hang up'));

      expect(await describer().describe(REQUEST)).toEqual({ kind: 'unclear' });
      expect(await describer().describe(REQUEST)).toEqual({ kind: 'unclear' });
    });
  });

  describe('API key', () => {
    it('refuses to be built in production without it, naming the variable', () => {
      expect(() => new AnthropicDeadlineDescriber(config({ NODE_ENV: 'production' }))).toThrow(
        'ANTHROPIC_API_KEY',
      );
    });

    it('is built outside production without it and answers unclear without calling the SDK', async () => {
      const describer = new AnthropicDeadlineDescriber(config({}));

      expect(await describer.describe(REQUEST)).toEqual({ kind: 'unclear' });
      expect(sdk.constructed).toHaveLength(0);
      expect(sdk.parse).not.toHaveBeenCalled();
    });

    it('is built in production with it', () => {
      expect(
        () => new AnthropicDeadlineDescriber(config({ NODE_ENV: 'production', ANTHROPIC_API_KEY: 'key' })),
      ).not.toThrow();
    });
  });
});
