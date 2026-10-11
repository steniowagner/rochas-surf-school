import { Injectable } from '@nestjs/common';
import {
  SchoolRule,
  SchoolRuleChange,
  SchoolRuleRepository,
} from '@rochas-surf-school/school-rules';
import { PrismaService } from '../../db/prisma.service.js';
import type { SchoolRule as SchoolRuleRecord } from '../../generated/prisma/client.js';

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PrismaSchoolRuleRepository implements SchoolRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SchoolRule[]> {
    const records = await this.prisma.schoolRule.findMany({
      orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
    });
    return records.map((record) => this.toDomain(record));
  }

  async findById(id: string): Promise<SchoolRule | null> {
    if (!UUID_FORMAT.test(id)) return null;

    const record = await this.prisma.schoolRule.findUnique({ where: { id } });
    return record ? this.toDomain(record) : null;
  }

  async getVersion(): Promise<number> {
    const { version } = await this.prisma.rulesVersion.findFirstOrThrow();
    return version;
  }

  async apply(change: SchoolRuleChange): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      if (change.bumpVersion) {
        await tx.rulesVersion.updateMany({
          data: { version: { increment: 1 } },
        });
      }

      if (change.delete.length > 0) {
        await tx.schoolRule.deleteMany({ where: { id: { in: change.delete } } });
      }

      for (const rule of change.save) {
        await tx.schoolRule.upsert({
          where: { id: rule.id },
          create: {
            id: rule.id,
            title: rule.title,
            description: rule.description,
            index: rule.index,
            createdBy: rule.createdBy ?? null,
            createdAt: rule.createdAt,
          },
          update: {
            title: rule.title,
            description: rule.description,
            index: rule.index,
          },
        });
      }

      const { version } = await tx.rulesVersion.findFirstOrThrow();
      return version;
    });
  }

  private toDomain(record: SchoolRuleRecord): SchoolRule {
    return new SchoolRule({
      id: record.id,
      title: record.title,
      description: record.description,
      index: record.index,
      createdBy: record.createdBy ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
