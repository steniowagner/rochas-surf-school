import { Enrolment } from '@rochas-surf-school/enrolment';
import { ConflictError } from '@rochas-surf-school/shared';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const OTHER_ID = '4d0d2c0f-2a6f-4e9f-8b4c-7a8f9e0d1c2b';
const CLASS_ID = 'c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e65';
const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const REQUESTED_AT = new Date('2026-10-18T12:00:00.000Z');
const NOW = new Date('2026-10-19T11:30:00.000Z');
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');

function domain(overrides: Partial<ConstructorParameters<typeof Enrolment>[0]> = {}) {
  return new Enrolment({
    id: ID,
    classId: CLASS_ID,
    studentId: STUDENT_ID,
    status: 'pending',
    requestedAt: REQUESTED_AT,
    ruleAcceptedAt: REQUESTED_AT,
    createdAt: REQUESTED_AT,
    ...overrides,
  });
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    classId: CLASS_ID,
    studentId: STUDENT_ID,
    status: 'pending',
    requestedAt: REQUESTED_AT,
    ruleAcceptedAt: REQUESTED_AT,
    decidedAt: null,
    reason: null,
    endedAt: null,
    createdAt: REQUESTED_AT,
    updatedAt: REQUESTED_AT,
    ...overrides,
  };
}

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('failed', { code, clientVersion: 'test' });
}

function setup() {
  const enrolment = {
    count: vi.fn(),
    groupBy: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(async () => ({ count: 1 })),
    updateManyAndReturn: vi.fn(),
  };
  const schoolClass = { findMany: vi.fn() };
  const queryRaw = vi.fn();
  const tx = { enrolment, $queryRaw: queryRaw };
  const prisma = {
    enrolment,
    schoolClass,
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new PrismaEnrolmentRepository(prisma as unknown as PrismaService);

  return { enrolment, schoolClass, queryRaw, prisma, repository };
}

describe('PrismaEnrolmentRepository', () => {
  describe('create', () => {
    it('stores the enrolment and answers it back', async () => {
      const { enrolment, repository } = setup();
      enrolment.create.mockResolvedValue(record());

      const out = await repository.create(domain());

      expect(enrolment.create).toHaveBeenCalledWith({
        data: {
          id: ID,
          classId: CLASS_ID,
          studentId: STUDENT_ID,
          status: 'pending',
          requestedAt: REQUESTED_AT,
          ruleAcceptedAt: REQUESTED_AT,
          decidedAt: null,
          reason: null,
          endedAt: null,
          createdAt: REQUESTED_AT,
        },
      });
      expect(out).toBeInstanceOf(Enrolment);
      expect(out.id).toBe(ID);
      expect(out.status).toBe('pending');
    });

    it('maps the unique violation of the partial index to enrolment.alreadyOpen', async () => {
      const { enrolment, repository } = setup();
      enrolment.create.mockRejectedValue(knownError('P2002'));

      await expect(repository.create(domain())).rejects.toEqual(new ConflictError('enrolment.alreadyOpen'));
    });

    it('lets other errors through', async () => {
      const { enrolment, repository } = setup();

      enrolment.create.mockRejectedValue(new Error('down'));
      await expect(repository.create(domain())).rejects.toThrow('down');

      enrolment.create.mockRejectedValue(knownError('P2003'));
      await expect(repository.create(domain())).rejects.toThrow('failed');
    });
  });

  describe('findById', () => {
    it('reads the enrolment', async () => {
      const { enrolment, repository } = setup();
      enrolment.findUnique.mockResolvedValue(record({ status: 'denied', decidedAt: NOW, reason: 'Sem vaga', endedAt: NOW }));

      const out = await repository.findById(ID);

      expect(enrolment.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
      expect(out).toMatchObject({ id: ID, status: 'denied', reason: 'Sem vaga' });
      expect(out!.decidedAt).toEqual(NOW);
      expect(out!.endedAt).toEqual(NOW);
    });

    it('answers null for an unknown id', async () => {
      const { enrolment, repository } = setup();
      enrolment.findUnique.mockResolvedValue(null);

      expect(await repository.findById(ID)).toBeNull();
    });
  });

  describe.each([
    ['withdraw', 'withdrawn'],
    ['expire', 'expired'],
  ] as const)('%s', (method, status) => {
    it('writes only while the enrolment is pending and says it wrote', async () => {
      const { enrolment, repository } = setup();

      expect(await repository[method](ID, NOW)).toBe(true);
      expect(enrolment.updateMany).toHaveBeenCalledWith({
        where: { id: ID, status: 'pending' },
        data: { status, endedAt: NOW, updatedAt: NOW },
      });
    });

    it('says it did not write when the enrolment is no longer pending', async () => {
      const { enrolment, repository } = setup();
      enrolment.updateMany.mockResolvedValue({ count: 0 });

      expect(await repository[method](ID, NOW)).toBe(false);
    });
  });

  describe('findExpirable', () => {
    it('reads the pending enrolments of started, not cancelled classes with their class facts', async () => {
      const { enrolment, repository } = setup();
      enrolment.findMany.mockResolvedValue([
        { ...record(), schoolClass: { discipline: 'surf', startsAt: STARTS_AT } },
        { ...record({ id: OTHER_ID }), schoolClass: { discipline: 'skate', startsAt: STARTS_AT } },
      ]);

      const out = await repository.findExpirable(NOW);

      expect(enrolment.findMany).toHaveBeenCalledWith({
        where: { status: 'pending', schoolClass: { startsAt: { lte: NOW }, cancelledAt: null } },
        include: { schoolClass: { select: { discipline: true, startsAt: true } } },
        orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
      });
      expect(out.map((item) => [item.enrolment.id, item.discipline, item.startsAt])).toEqual([
        [ID, 'surf', STARTS_AT],
        [OTHER_ID, 'skate', STARTS_AT],
      ]);
    });
  });

  describe('closeOpenForClass', () => {
    it('ends the open enrolments in one write and answers the ones it closed, oldest request first', async () => {
      const { enrolment, repository } = setup();
      const later = new Date('2026-10-18T13:00:00.000Z');
      enrolment.updateManyAndReturn.mockResolvedValue([
        record({ id: OTHER_ID, status: 'classCancelled', requestedAt: later, endedAt: NOW }),
        record({ status: 'classCancelled', endedAt: NOW }),
        record({ id: '5e1e3d1a-3b7a-4faa-9c5d-8b9a0f1e2d3c', status: 'classCancelled', endedAt: NOW }),
      ]);

      const out = await repository.closeOpenForClass(CLASS_ID, NOW);

      expect(enrolment.updateManyAndReturn).toHaveBeenCalledWith({
        where: { classId: CLASS_ID, status: { in: ['pending', 'approved'] } },
        data: { status: 'classCancelled', endedAt: NOW, updatedAt: NOW },
      });
      expect(out.map((item) => item.id)).toEqual([
        ID,
        '5e1e3d1a-3b7a-4faa-9c5d-8b9a0f1e2d3c',
        OTHER_ID,
      ]);
      expect(out.every((item) => item.status === 'classCancelled')).toBe(true);
    });
  });

  describe('findPendingByClass', () => {
    const pendingClass = (id: string, requests: unknown[]) => ({
      id,
      discipline: 'surf',
      level: 'beginner',
      startsAt: STARTS_AT,
      endsAt: new Date('2026-10-19T12:00:00.000Z'),
      capacity: 8,
      location: { name: 'Praia do Futuro' },
      enrolments: requests,
    });
    const request = {
      id: ID,
      requestedAt: REQUESTED_AT,
      student: { id: STUDENT_ID, name: 'Ana Souza', photoUrl: null },
    };

    it('reads the upcoming classes with their pending requests and the seats taken', async () => {
      const { enrolment, schoolClass, repository } = setup();
      schoolClass.findMany.mockResolvedValue([pendingClass(CLASS_ID, [request]), pendingClass(OTHER_ID, [request])]);
      enrolment.groupBy.mockResolvedValue([{ classId: CLASS_ID, _count: { _all: 3 } }]);

      const out = await repository.findPendingByClass(NOW);

      expect(schoolClass.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { startsAt: { gt: NOW }, cancelledAt: null, enrolments: { some: { status: 'pending' } } },
          orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
        }),
      );
      expect(enrolment.groupBy).toHaveBeenCalledWith({
        by: ['classId'],
        where: { classId: { in: [CLASS_ID, OTHER_ID] }, status: 'approved' },
        _count: { _all: true },
      });
      expect(out).toEqual([
        { ...pendingClass(CLASS_ID, []), enrolments: undefined, seatsTaken: 3, requests: [request] },
        { ...pendingClass(OTHER_ID, []), enrolments: undefined, seatsTaken: 0, requests: [request] },
      ].map(({ enrolments: _ignored, ...item }) => item));
    });

    it('answers nothing, and counts nothing, when no class has a pending request', async () => {
      const { enrolment, schoolClass, repository } = setup();
      schoolClass.findMany.mockResolvedValue([]);

      expect(await repository.findPendingByClass(NOW)).toEqual([]);
      expect(enrolment.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    function lockedClass(capacity: number, taken: number) {
      const harness = setup();
      harness.enrolment.findUnique.mockResolvedValue({ classId: CLASS_ID, status: 'pending' });
      harness.queryRaw.mockResolvedValue([{ capacity }]);
      harness.enrolment.count.mockResolvedValue(taken);
      return harness;
    }

    it('locks the class, counts the seats and approves while the enrolment is pending', async () => {
      const { enrolment, queryRaw, prisma, repository } = lockedClass(8, 7);

      expect(await repository.approve(ID, NOW)).toBe('approved');
      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(String(queryRaw.mock.calls[0][0].sql)).toContain('FOR UPDATE');
      expect(queryRaw.mock.calls[0][0].values).toEqual([CLASS_ID]);
      expect(enrolment.count).toHaveBeenCalledWith({ where: { classId: CLASS_ID, status: 'approved' } });
      expect(enrolment.updateMany).toHaveBeenCalledWith({
        where: { id: ID, status: 'pending' },
        data: { status: 'approved', decidedAt: NOW, updatedAt: NOW },
      });
    });

    it('answers full, and writes nothing, when the seats are taken', async () => {
      const { enrolment, repository } = lockedClass(8, 8);

      expect(await repository.approve(ID, NOW)).toBe('full');
      expect(enrolment.updateMany).not.toHaveBeenCalled();
    });

    it('answers notPending for a missing or decided enrolment and for a class that is gone', async () => {
      const missing = setup();
      missing.enrolment.findUnique.mockResolvedValue(null);
      const decided = setup();
      decided.enrolment.findUnique.mockResolvedValue({ classId: CLASS_ID, status: 'denied' });
      const gone = setup();
      gone.enrolment.findUnique.mockResolvedValue({ classId: CLASS_ID, status: 'pending' });
      gone.queryRaw.mockResolvedValue([]);

      expect(await missing.repository.approve(ID, NOW)).toBe('notPending');
      expect(await decided.repository.approve(ID, NOW)).toBe('notPending');
      expect(await gone.repository.approve(ID, NOW)).toBe('notPending');
      expect(missing.queryRaw).not.toHaveBeenCalled();
      expect(decided.queryRaw).not.toHaveBeenCalled();
    });

    it('answers notPending when the conditional write loses', async () => {
      const { enrolment, repository } = lockedClass(8, 0);
      enrolment.updateMany.mockResolvedValue({ count: 0 });

      expect(await repository.approve(ID, NOW)).toBe('notPending');
    });
  });

  describe('deny', () => {
    it('writes the reason only while the enrolment is pending and says it wrote', async () => {
      const { enrolment, repository } = setup();

      expect(await repository.deny(ID, 'Sem vaga', NOW)).toBe(true);
      expect(enrolment.updateMany).toHaveBeenCalledWith({
        where: { id: ID, status: 'pending' },
        data: { status: 'denied', reason: 'Sem vaga', decidedAt: NOW, updatedAt: NOW },
      });

      enrolment.updateMany.mockResolvedValue({ count: 0 });
      expect(await repository.deny(ID, null, NOW)).toBe(false);
    });
  });
});
