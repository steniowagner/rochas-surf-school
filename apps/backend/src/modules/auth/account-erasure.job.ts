import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EraseClosedAccounts, EraseDeniedRegistrations } from '@rochas-surf-school/auth';
import { NotificationsPersonNotificationEraser } from '../notifications/notifications.person-notification-eraser.js';
import { NotificationsRegistrationNotificationEraser } from '../notifications/notifications.registration-notification-eraser.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

/** How many accounts one run erased, per kind. */
export interface AccountErasureRun {
  deniedRegistrations: number;
  closedAccounts: number;
}

/**
 * Every minute, erases the registrations denied 30 days ago or more, then the accounts deleted or removed 30 days ago
 * or more. Each step runs on its own: one failing is logged and doesn't stop the other. Idempotent: an erased account
 * is gone or anonymous, so a late or repeated tick finds nothing. Never throws, and logs only how many accounts were
 * erased, never who.
 */
@Injectable()
export class AccountErasureJob {
  private readonly logger = new Logger(AccountErasureJob.name);

  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly registrationNotificationEraser: NotificationsRegistrationNotificationEraser,
    private readonly personNotificationEraser: NotificationsPersonNotificationEraser,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'account-erasure', waitForCompletion: true })
  async run(): Promise<AccountErasureRun> {
    const deniedRegistrations = await this.step('denied registration(s)', () =>
      new EraseDeniedRegistrations(
        this.userRepository,
        this.registrationNotificationEraser,
        this.clock,
      ).execute(),
    );
    const closedAccounts = await this.step('closed account(s)', () =>
      new EraseClosedAccounts(this.userRepository, this.personNotificationEraser, this.clock).execute(),
    );

    return { deniedRegistrations, closedAccounts };
  }

  /** Runs one erasure, logs its count when it erased something, and answers 0 after logging a failure. */
  private async step(kind: string, erase: () => Promise<{ erased: number }>): Promise<number> {
    try {
      const { erased } = await erase();
      if (erased > 0) {
        this.logger.log(`Erased ${erased} ${kind}`);
      }
      return erased;
    } catch (error) {
      this.logger.error(
        `Could not erase the ${kind}`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }
}
