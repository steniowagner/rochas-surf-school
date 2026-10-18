import { CancellationRule } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaCancellationRuleRepository } from './cancellation-rule.prisma.js';

const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const NOW = new Date('2026-10-18T12:00:00.000Z');

function setup() {
  const calls: string[] = [];
  const cancellationRule = {
    findMany: vi.fn(),
    upsert: vi.fn(async () => calls.push('rule')),
  };
  const schoolClass = { updateMany: vi.fn(async () => calls.push('classes')) };
  const prisma = {
    cancellationRule,
    schoolClass,
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) =>
      work({ cancellationRule, schoolClass }),
    ),
  };
  const repository = new PrismaCancellationRuleRepository(prisma as unknown as PrismaService);
  return { cancellationRule, schoolClass, prisma, calls, repository };
}

describe('PrismaCancellationRuleRepository', () => {
  it('reads the saved rules', async () => {
    const { cancellationRule, repository } = setup();
    cancellationRule.findMany.mockResolvedValue([
      { discipline: 'surf', text: 'Até 12 horas antes.', updatedBy: ADMIN_ID, updatedAt: NOW },
      { discipline: 'skate', text: 'Sem regra.', updatedBy: null, updatedAt: NOW },
    ]);

    const rules = await repository.findAll();

    expect(cancellationRule.findMany).toHaveBeenCalledWith({ orderBy: { discipline: 'asc' } });
    expect(rules.map((rule) => [rule.discipline, rule.text, rule.updatedBy === ADMIN_ID])).toEqual([
      ['surf', 'Até 12 horas antes.', true],
      ['skate', 'Sem regra.', false],
    ]);
  });

  it('stores the rule and clears the upcoming classes of its discipline in one transaction (deadline)', async () => {
    const { cancellationRule, schoolClass, prisma, calls, repository } = setup();
    const rule = new CancellationRule({
      discipline: 'skate',
      text: ' Até 6 horas antes. ',
      updatedBy: ADMIN_ID,
      updatedAt: NOW,
    });

    await repository.save(rule, NOW);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['rule', 'classes']);
    expect(cancellationRule.upsert).toHaveBeenCalledWith({
      where: { discipline: 'skate' },
      create: { discipline: 'skate', text: 'Até 6 horas antes.', updatedBy: ADMIN_ID, updatedAt: NOW },
      update: { text: 'Até 6 horas antes.', updatedBy: ADMIN_ID, updatedAt: NOW },
    });
    expect(schoolClass.updateMany).toHaveBeenCalledWith({
      where: { discipline: 'skate', startsAt: { gt: NOW }, cancelledAt: null },
      data: {
        cancellationDeadline: null,
        deadlineAttempts: 0,
        deadlineNextAttemptAt: null,
        deadlineRevision: { increment: 1 },
      },
    });
  });

  it('propagates a failure so the transaction rolls back (deadline)', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.updateMany.mockRejectedValue(new Error('down'));
    const rule = new CancellationRule({ discipline: 'surf', text: 'x', updatedBy: ADMIN_ID });

    await expect(repository.save(rule, NOW)).rejects.toThrow('down');
  });
});
