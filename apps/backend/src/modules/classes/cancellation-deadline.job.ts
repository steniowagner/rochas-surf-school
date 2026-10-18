import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  WorkOutCancellationDeadlines,
  WorkOutCancellationDeadlinesOut,
} from '@rochas-surf-school/classes';
import { AnthropicDeadlineDescriber } from './anthropic.deadline-describer.js';
import { PrismaCancellationRuleRepository } from './cancellation-rule.prisma.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * Every minute, works out the cancellation deadline of the upcoming classes that have none (at most 20 per tick, 5 at a
 * time). Idempotent: a class with a deadline is never picked, and a failed one waits for its backoff. Never throws, and
 * logs only counts, never the rules or the classes.
 */
@Injectable()
export class CancellationDeadlineJob {
  private readonly logger = new Logger(CancellationDeadlineJob.name);

  constructor(
    private readonly schoolClassRepository: PrismaSchoolClassRepository,
    private readonly cancellationRuleRepository: PrismaCancellationRuleRepository,
    private readonly locationRepository: PrismaLocationRepository,
    private readonly describer: AnthropicDeadlineDescriber,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'cancellation-deadline', waitForCompletion: true })
  async run(): Promise<WorkOutCancellationDeadlinesOut> {
    try {
      const result = await new WorkOutCancellationDeadlines(
        this.schoolClassRepository,
        this.cancellationRuleRepository,
        this.locationRepository,
        this.describer,
        this.clock,
      ).execute();
      if (result.workedOut > 0 || result.failed > 0) {
        this.logger.log(
          `Cancellation deadlines: ${result.workedOut} worked out, ${result.failed} failed`,
        );
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Could not work out the cancellation deadlines',
        error instanceof Error ? error.stack : String(error),
      );
      return { workedOut: 0, failed: 0 };
    }
  }
}
