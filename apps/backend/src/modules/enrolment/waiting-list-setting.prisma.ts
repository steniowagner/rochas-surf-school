import { Injectable } from '@nestjs/common';
import { SCHOOL_SETTINGS_ID } from '@rochas-surf-school/school-settings';
import type { WaitingListSetting } from '@rochas-surf-school/enrolment';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaWaitingListSetting implements WaitingListSetting {
  constructor(private readonly prisma: PrismaService) {}

  /** The school settings table is read directly; with no row the waiting list is on. */
  async isEnabled(): Promise<boolean> {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { id: SCHOOL_SETTINGS_ID },
      select: { waitingListEnabled: true },
    });

    return settings?.waitingListEnabled ?? true;
  }
}
