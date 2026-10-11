import { SchoolRule } from '@rochas-surf-school/school-rules';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaSchoolRuleRepository } from './school-rule.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const OTHER_ID = '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e';
const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const NOW = new Date('2026-10-11T12:00:00.000Z');

function setup() {
  const schoolRule = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  };
  const rulesVersion = {
    findFirstOrThrow: vi.fn().mockResolvedValue({ version: 4 }),
    updateMany: vi.fn(),
  };
  const calls: string[] = [];
  schoolRule.deleteMany.mockImplementation(async () => calls.push('delete'));
  schoolRule.upsert.mockImplementation(async () => calls.push('upsert'));
  rulesVersion.updateMany.mockImplementation(async () => calls.push('bump'));
  const prisma = {
    schoolRule,
    rulesVersion,
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) =>
      work({ schoolRule, rulesVersion }),
    ),
  };
  const repository = new PrismaSchoolRuleRepository(prisma as unknown as PrismaService);
  return { schoolRule, rulesVersion, prisma, calls, repository };
}

function record(id = ID, createdBy: string | null = ADMIN_ID) {
  return {
    id,
    title: 'Chega 15 min antes',
    description: 'Tempo para vestir o fato.',
    index: 2,
    createdBy,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function rule(id = ID, index = 2) {
  return new SchoolRule({
    id,
    title: 'Chega 15 min antes',
    description: 'Tempo para vestir o fato.',
    index,
    createdBy: ADMIN_ID,
    createdAt: NOW,
  });
}

describe('PrismaSchoolRuleRepository', () => {
  it('lists the rules ordered by index, then creation time, mapped to the domain', async () => {
    const { schoolRule, repository } = setup();
    schoolRule.findMany.mockResolvedValue([record(ID, ADMIN_ID), record(OTHER_ID, null)]);

    const rules = await repository.findAll();

    expect(schoolRule.findMany).toHaveBeenCalledWith({
      orderBy: [{ index: 'asc' }, { createdAt: 'asc' }],
    });
    expect(rules.map((item) => [item.id, item.createdBy])).toEqual([
      [ID, ADMIN_ID],
      [OTHER_ID, undefined],
    ]);
    expect(rules[0]).toMatchObject({
      title: 'Chega 15 min antes',
      description: 'Tempo para vestir o fato.',
      index: 2,
    });
  });

  it('finds a rule by id', async () => {
    const { schoolRule, repository } = setup();
    schoolRule.findUnique.mockResolvedValue(record());

    const found = await repository.findById(ID);

    expect(schoolRule.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
    expect(found?.id).toBe(ID);
  });

  it('answers null when the rule does not exist', async () => {
    const { schoolRule, repository } = setup();
    schoolRule.findUnique.mockResolvedValue(null);

    await expect(repository.findById(ID)).resolves.toBeNull();
  });

  it('answers null for a malformed id without querying', async () => {
    const { schoolRule, repository } = setup();

    await expect(repository.findById('not-a-uuid')).resolves.toBeNull();
    expect(schoolRule.findUnique).not.toHaveBeenCalled();
  });

  it('reads the version from the single row', async () => {
    const { repository } = setup();

    await expect(repository.getVersion()).resolves.toBe(4);
  });

  describe('apply', () => {
    it('bumps the version, deletes, then saves, in one transaction', async () => {
      const { schoolRule, rulesVersion, prisma, calls, repository } = setup();

      const version = await repository.apply({
        save: [rule(ID, 1), rule(OTHER_ID, 2)],
        delete: [ADMIN_ID],
        bumpVersion: true,
      });

      expect(version).toBe(4);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(calls).toEqual(['bump', 'delete', 'upsert', 'upsert']);
      expect(rulesVersion.updateMany).toHaveBeenCalledWith({
        data: { version: { increment: 1 } },
      });
      expect(schoolRule.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [ADMIN_ID] } },
      });
      expect(schoolRule.upsert).toHaveBeenNthCalledWith(1, {
        where: { id: ID },
        create: {
          id: ID,
          title: 'Chega 15 min antes',
          description: 'Tempo para vestir o fato.',
          index: 1,
          createdBy: ADMIN_ID,
          createdAt: NOW,
        },
        update: {
          title: 'Chega 15 min antes',
          description: 'Tempo para vestir o fato.',
          index: 1,
        },
      });
    });

    it('does not touch the version nor delete when there is nothing to', async () => {
      const { schoolRule, rulesVersion, repository } = setup();

      const version = await repository.apply({
        save: [new SchoolRule({ title: 't', description: 'd', index: 1 })],
        delete: [],
        bumpVersion: false,
      });

      expect(version).toBe(4);
      expect(rulesVersion.updateMany).not.toHaveBeenCalled();
      expect(schoolRule.deleteMany).not.toHaveBeenCalled();
      expect(schoolRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ createdBy: null }) }),
      );
    });

    it('rejects, so the transaction rolls back, when a write fails', async () => {
      const { schoolRule, repository } = setup();
      schoolRule.upsert.mockRejectedValue(new Error('write failed'));

      await expect(
        repository.apply({ save: [rule()], delete: [], bumpVersion: true }),
      ).rejects.toThrow('write failed');
    });
  });
});
