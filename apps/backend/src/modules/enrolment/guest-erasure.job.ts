import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EraseGuestData, EraseGuestDataOut } from '@rochas-surf-school/enrolment';
import { PrismaGuestRepository } from './guest.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * Every minute, erases the name and number of the guests whose class ended or was cancelled 30 days ago. Idempotent:
 * the write only touches guests not erased yet. Never throws, and logs only the count, never the guests or the classes.
 */
@Injectable()
export class GuestErasureJob {
  private readonly logger = new Logger(GuestErasureJob.name);

  constructor(
    private readonly guestRepository: PrismaGuestRepository,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'guest-erasure', waitForCompletion: true })
  async run(): Promise<EraseGuestDataOut> {
    try {
      const result = await new EraseGuestData(this.guestRepository, this.clock).execute();
      if (result.erased > 0) {
        this.logger.log(`Guest erasure: ${result.erased} erased`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Could not erase the guests data',
        error instanceof Error ? error.stack : String(error),
      );
      return { erased: 0 };
    }
  }
}
