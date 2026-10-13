import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EraseDeniedRegistrations,
  EraseDeniedRegistrationsOut,
} from '@rochas-surf-school/auth';
import { NotificationsRegistrationNotificationEraser } from '../notifications/notifications.registration-notification-eraser.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

/**
 * Every minute, erases the registrations denied 30 days ago or more. Idempotent: an erased account is gone, so a late
 * or repeated tick finds nothing. Never throws, and logs only how many accounts were erased, never who.
 */
@Injectable()
export class AccountErasureJob {
  private readonly logger = new Logger(AccountErasureJob.name);

  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly registrationNotificationEraser: NotificationsRegistrationNotificationEraser,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'account-erasure', waitForCompletion: true })
  async run(): Promise<EraseDeniedRegistrationsOut> {
    try {
      const result = await new EraseDeniedRegistrations(
        this.userRepository,
        this.registrationNotificationEraser,
        this.clock,
      ).execute();
      if (result.erased > 0) {
        this.logger.log(`Erased ${result.erased} denied registration(s)`);
      }
      return result;
    } catch (error) {
      this.logger.error(
        'Could not erase the denied registrations',
        error instanceof Error ? error.stack : String(error),
      );
      return { erased: 0 };
    }
  }
}
