import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CheckPushReceipts } from '@rochas-surf-school/notifications';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/**
 * Every minute, asks Expo for the receipts of the tickets that are 15 minutes old and deletes the tokens it reports
 * as unregistered. Idempotent: every ticket asked about is deleted, so a late or repeated tick asks nothing twice.
 */
@Injectable()
export class PushReceiptCheckJob {
  private readonly logger = new Logger(PushReceiptCheckJob.name);

  constructor(
    private readonly pushTicketRepository: PrismaPushTicketRepository,
    private readonly pushTokenRepository: PrismaPushTokenRepository,
    private readonly pushProvider: ExpoPushProvider,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'push-receipt-check', waitForCompletion: true })
  async run(): Promise<void> {
    try {
      await new CheckPushReceipts(
        this.pushTicketRepository,
        this.pushTokenRepository,
        this.pushProvider,
        this.clock,
      ).execute();
    } catch (error) {
      this.logger.error(
        'Could not check the push receipts',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
