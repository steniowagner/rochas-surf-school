import { Injectable } from '@nestjs/common';
import {
  SCHOOL_SETTINGS_ID,
  SchoolSettings,
  SchoolSettingsRepository,
} from '@rochas-surf-school/school-settings';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaSchoolSettingsRepository implements SchoolSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<SchoolSettings | null> {
    const record = await this.prisma.schoolSettings.findUnique({
      where: { id: SCHOOL_SETTINGS_ID },
    });
    if (!record) return null;

    return new SchoolSettings({
      id: record.id,
      whatsappNumber: record.whatsappNumber ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  async save(settings: SchoolSettings): Promise<void> {
    const whatsappNumber = settings.whatsappNumber ?? null;
    await this.prisma.schoolSettings.upsert({
      where: { id: SCHOOL_SETTINGS_ID },
      create: { id: SCHOOL_SETTINGS_ID, whatsappNumber },
      update: { whatsappNumber },
    });
  }
}
