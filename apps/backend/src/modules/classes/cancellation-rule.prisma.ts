import { Injectable } from '@nestjs/common';
import { CancellationRule, CancellationRuleRepository } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import type { CancellationRule as CancellationRuleRecord } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaCancellationRuleRepository implements CancellationRuleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CancellationRule[]> {
    const records = await this.prisma.cancellationRule.findMany({ orderBy: { discipline: 'asc' } });

    return records.map((record) => this.toDomain(record));
  }

  async save(rule: CancellationRule, now: Date): Promise<void> {
    // The rule and the clearing of the upcoming classes' deadlines are all or nothing.
    await this.prisma.$transaction(async (tx) => {
      await tx.cancellationRule.upsert({
        where: { discipline: rule.discipline },
        create: {
          discipline: rule.discipline,
          text: rule.text,
          updatedBy: rule.updatedBy,
          updatedAt: rule.updatedAt,
        },
        update: { text: rule.text, updatedBy: rule.updatedBy, updatedAt: rule.updatedAt },
      });
      await tx.schoolClass.updateMany({
        where: { discipline: rule.discipline, startsAt: { gt: now }, cancelledAt: null },
        data: {
          cancellationDeadline: null,
          deadlineAttempts: 0,
          deadlineNextAttemptAt: null,
          deadlineRevision: { increment: 1 },
        },
      });
    });
  }

  private toDomain(record: CancellationRuleRecord): CancellationRule {
    return new CancellationRule({
      discipline: record.discipline,
      text: record.text,
      // The author's account may be gone (ON DELETE SET NULL); the rule stays.
      updatedBy: record.updatedBy ?? '00000000-0000-4000-8000-000000000000',
      updatedAt: record.updatedAt,
    });
  }
}
