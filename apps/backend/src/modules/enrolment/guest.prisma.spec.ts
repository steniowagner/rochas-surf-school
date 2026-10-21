import { Guest } from '@rochas-surf-school/enrolment';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaGuestRepository } from './guest.prisma.js';

const ID = '8f2a6c14-9d3b-4e57-a1c8-2b7d5e0f3a96';
const CLASS_ID = '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const NOW = new Date('2026-10-19T09:00:00.000Z');
const CREATED_AT = new Date('2026-10-18T09:00:00.000Z');

function domain() {
  return new Guest({
    id: ID,
    classId: CLASS_ID,
    name: 'Carolina Reis',
    whatsappNumber: '+5585999990000',
    createdBy: ADMIN_ID,
    createdAt: CREATED_AT,
  });
}

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    classId: CLASS_ID,
    name: 'Carolina Reis',
    whatsappNumber: '+5585999990000',
    createdBy: ADMIN_ID,
    erasedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

function setup() {
  const enrolment = { count: vi.fn(async () => 0) };
  const guest = {
    count: vi.fn(async () => 0),
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(async () => ({ count: 1 })),
    updateMany: vi.fn(async () => ({ count: 2 })),
  };
  const queryRaw = vi.fn();
  queryRaw.mockResolvedValue([{ capacity: 8 }]);
  const tx = { enrolment, guest, $queryRaw: queryRaw };
  const prisma = {
    guest,
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  const repository = new PrismaGuestRepository(prisma as unknown as PrismaService);

  return { enrolment, guest, queryRaw, prisma, repository };
}

describe('PrismaGuestRepository', () => {
  describe('create', () => {
    it('locks the class, counts the seats and stores the guest while one is free', async () => {
      const { enrolment, guest, queryRaw, prisma, repository } = setup();
      enrolment.count.mockResolvedValue(6);
      guest.count.mockResolvedValue(1);

      expect(await repository.create(domain())).toBe('added');
      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(String(queryRaw.mock.calls[0][0].sql)).toContain('FOR UPDATE');
      expect(queryRaw.mock.calls[0][0].values).toEqual([CLASS_ID]);
      expect(enrolment.count).toHaveBeenCalledWith({ where: { classId: CLASS_ID, status: 'approved' } });
      expect(guest.count).toHaveBeenCalledWith({ where: { classId: CLASS_ID } });
      expect(guest.create).toHaveBeenCalledWith({
        data: {
          id: ID,
          classId: CLASS_ID,
          name: 'Carolina Reis',
          whatsappNumber: '+5585999990000',
          createdBy: ADMIN_ID,
          createdAt: CREATED_AT,
        },
      });
    });

    it('answers full, and writes nothing, when the students and guests fill the class', async () => {
      const { enrolment, guest, repository } = setup();
      enrolment.count.mockResolvedValue(7);
      guest.count.mockResolvedValue(1);

      expect(await repository.create(domain())).toBe('full');
      expect(guest.create).not.toHaveBeenCalled();
    });

    it('answers full for a class that is gone', async () => {
      const { guest, queryRaw, repository } = setup();
      queryRaw.mockResolvedValue([]);

      expect(await repository.create(domain())).toBe('full');
      expect(guest.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('maps the record, erased ones included', async () => {
      const { guest, repository } = setup();
      guest.findUnique.mockResolvedValue(record({ name: null, whatsappNumber: null, erasedAt: NOW }));

      const found = await repository.findById(ID);

      expect(guest.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
      expect(found).toMatchObject({ id: ID, classId: CLASS_ID, name: null, whatsappNumber: null });
      expect(found?.erasedAt).toEqual(NOW);
    });

    it('answers null when there is none', async () => {
      const { guest, repository } = setup();
      guest.findUnique.mockResolvedValue(null);

      expect(await repository.findById(ID)).toBeNull();
    });
  });

  describe('delete', () => {
    it('tells whether it deleted', async () => {
      const { guest, repository } = setup();

      expect(await repository.delete(ID)).toBe(true);
      expect(guest.deleteMany).toHaveBeenCalledWith({ where: { id: ID } });

      guest.deleteMany.mockResolvedValue({ count: 0 });
      expect(await repository.delete(ID)).toBe(false);
    });
  });

  describe('eraseEndedBefore', () => {
    it('erases, in one write, the guests of classes that ended or were cancelled by the cutoff', async () => {
      const { guest, repository } = setup();
      const cutoff = new Date('2026-09-19T09:00:00.000Z');

      expect(await repository.eraseEndedBefore(cutoff, NOW)).toBe(2);
      expect(guest.updateMany).toHaveBeenCalledOnce();
      expect(guest.updateMany).toHaveBeenCalledWith({
        where: {
          erasedAt: null,
          OR: [{ schoolClass: { endsAt: { lte: cutoff } } }, { schoolClass: { cancelledAt: { lte: cutoff } } }],
        },
        data: { name: null, whatsappNumber: null, erasedAt: NOW, updatedAt: NOW },
      });
    });
  });
});
