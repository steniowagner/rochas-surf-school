import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CancellationDeadlineDescriber,
  CancellationDeadlineDescription,
  CancellationDeadlineRequest,
} from '@rochas-surf-school/classes';
import { z } from 'zod';

export const DEADLINE_MODEL = 'claude-opus-5-5';
export const DEADLINE_SYSTEM_PROMPT = `You read the cancellation rule of a surf and skate school and say until when a student may cancel one class.

The user message is a JSON object with the rule and the class's details. The rule is written by the school in Brazilian Portuguese. All dates and times are in the America/Fortaleza time zone.

Answer with one of four kinds:
- "minutesBefore": the rule gives a number of minutes or hours before the class starts. Set "minutes" to that amount in minutes (for example 12 hours is 720).
- "daysBeforeAt": the rule gives a number of days before the class, at a time of day (for example "until 6 pm the day before"). Set "days" (0 means the day of the class) and "time" as HH:mm in 24 hours.
- "classStart": the rule lets the student cancel at any time, until the class starts.
- "unclear": the rule is ambiguous, contradictory, doesn't say, or doesn't apply to this class.

Set the fields a kind doesn't use to null. Never guess: when you are not sure, answer "unclear".`;

const DESCRIPTION_SCHEMA = z.object({
  kind: z.enum(['minutesBefore', 'daysBeforeAt', 'classStart', 'unclear']),
  minutes: z.number().int().nullable(),
  days: z.number().int().nullable(),
  time: z.string().nullable(),
});

const UNCLEAR: CancellationDeadlineDescription = { kind: 'unclear' };

/** Maps the flat answer of the model to the domain union; a kind missing its fields is `unclear`. */
function toDescription(answer: z.infer<typeof DESCRIPTION_SCHEMA>): CancellationDeadlineDescription {
  switch (answer.kind) {
    case 'minutesBefore':
      return answer.minutes === null ? UNCLEAR : { kind: 'minutesBefore', minutes: answer.minutes };
    case 'daysBeforeAt':
      return answer.days === null || answer.time === null
        ? UNCLEAR
        : { kind: 'daysBeforeAt', days: answer.days, time: answer.time };
    case 'classStart':
      return { kind: 'classStart' };
    default:
      return UNCLEAR;
  }
}

/**
 * Describes a class's cancellation deadline with Claude. Every failure (no key, an API or network error, a refusal,
 * an answer that doesn't parse) answers `unclear`: the job retries. Logs never carry the rule or the class.
 */
@Injectable()
export class AnthropicDeadlineDescriber implements CancellationDeadlineDescriber {
  private readonly logger = new Logger(AnthropicDeadlineDescriber.name);
  private readonly client?: Anthropic;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      if (configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set: cancellation deadlines cannot be worked out, so classes stay without one',
      );
      return;
    }

    // The job is the retry: one attempt, a bounded wait.
    this.client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 0 });
  }

  async describe(request: CancellationDeadlineRequest): Promise<CancellationDeadlineDescription> {
    if (!this.client) {
      return UNCLEAR;
    }

    try {
      const response = await this.client.beta.messages.parse({
        model: DEADLINE_MODEL,
        max_tokens: 4096,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: DEADLINE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(request) }],
        output_config: { effort: 'low', format: zodOutputFormat(DESCRIPTION_SCHEMA) },
      });

      if (response.stop_reason === 'refusal' || !response.parsed_output) {
        this.logger.warn(`The model gave no usable answer (${response.stop_reason ?? 'no stop reason'})`);
        return UNCLEAR;
      }

      return toDescription(response.parsed_output);
    } catch (error) {
      this.logger.warn(
        `The model could not be reached: ${error instanceof Anthropic.APIError ? `API error ${error.status}` : 'network or parse error'}`,
      );
      return UNCLEAR;
    }
  }
}
