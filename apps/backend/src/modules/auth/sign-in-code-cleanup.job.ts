import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DeleteExpiredSignInCodes,
  DeleteExpiredSignInCodesOut,
} from '@rochas-surf-school/auth';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/** Deletes expired sign-in codes every minute (D-14); idempotent, so a late or repeated tick is harmless. */
@Injectable()
export class SignInCodeCleanupJob {
  constructor(
    private readonly signInCodeRepository: PrismaSignInCodeRepository,
    private readonly clock: SystemClockProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'sign-in-code-cleanup', waitForCompletion: true })
  run(): Promise<DeleteExpiredSignInCodesOut> {
    return new DeleteExpiredSignInCodes(this.signInCodeRepository, this.clock).execute();
  }
}
