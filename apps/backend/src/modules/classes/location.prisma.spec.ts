import { ConflictError } from '@rochas-surf-school/shared';
import { Location } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaLocationRepository } from './location.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const NOW = new Date('2026-10-14T12:00:00.000Z');

function setup() {
  const location = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  };
  const schoolClass = { updateMany: vi.fn() };
  const classInstructor = { groupBy: vi.fn() };
  const tx = { location, schoolClass };
  const prisma = {
    location,
    schoolClass,
    classInstructor,
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const repository = new PrismaLocationRepository(prisma as unknown as PrismaService);
  return { location, schoolClass, classInstructor, prisma, repository };
}

function record(id = ID, name = 'Praia do Futuro') {
  return {
    id,
    name,
    nameKey: name.toLowerCase(),
    address: 'Av. Zezé Diogo, 5000',
    latitude: -3.7442,
    longitude: -38.4617,
    archivedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function domain(overrides: Record<string, unknown> = {}) {
  return new Location({
    id: ID,
    name: 'Praia do Futuro',
    address: 'Av. Zezé Diogo, 5000',
    latitude: -3.7442,
    longitude: -38.4617,
    createdAt: NOW,
    ...overrides,
  });
}

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('unique', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('PrismaLocationRepository', () => {
  it('lists the active locations ordered by name key, then id, with their upcoming classes', async () => {
    const { location, repository } = setup();
    location.findMany.mockResolvedValue([
      { ...record(ID, 'Áurea'), _count: { classes: 2 } },
      { ...record(), latitude: null, longitude: null, _count: { classes: 0 } },
    ]);

    const locations = await repository.findActive(NOW);

    expect(location.findMany).toHaveBeenCalledWith({
      where: { archivedAt: null },
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
      include: {
        _count: {
          select: { classes: { where: { startsAt: { gt: NOW }, cancelledAt: null } } },
        },
      },
    });
    expect(
      locations.map((item) => [item.location.name, item.location.nameKey, item.upcomingClasses]),
    ).toEqual([
      ['Áurea', 'aurea', 2],
      ['Praia do Futuro', 'praia do futuro', 0],
    ]);
    expect([locations[1].location.latitude, locations[1].location.longitude]).toEqual([null, null]);
  });

  it('finds a location by id, archived or not, with its point', async () => {
    const { location, repository } = setup();
    const archivedAt = new Date('2026-10-01T10:00:00.000Z');
    location.findUnique.mockResolvedValue({ ...record(), archivedAt });

    const found = await repository.findById(ID);

    expect(location.findUnique).toHaveBeenCalledWith({ where: { id: ID } });
    expect(found?.address).toBe('Av. Zezé Diogo, 5000');
    expect([found?.latitude, found?.longitude, found?.archivedAt]).toEqual([
      -3.7442,
      -38.4617,
      archivedAt,
    ]);
  });

  it('answers null for an unknown id, and without a lookup for one that is not a uuid', async () => {
    const { location, repository } = setup();
    location.findUnique.mockResolvedValue(null);

    expect(await repository.findById(ID)).toBeNull();
    expect(await repository.findById('not-a-uuid')).toBeNull();
    expect(location.findUnique).toHaveBeenCalledTimes(1);
  });

  it('tells whether a name key is taken', async () => {
    const { location, repository } = setup();
    location.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    expect(await repository.existsByNameKey('praia do futuro')).toBe(true);
    expect(await repository.existsByNameKey('outra')).toBe(false);
    expect(location.count).toHaveBeenCalledWith({ where: { nameKey: 'outra' } });
  });

  it('creates a location with its point and returns it', async () => {
    const { location, repository } = setup();
    location.create.mockResolvedValue(record());

    const created = await repository.create(domain());

    expect(location.create).toHaveBeenCalledWith({
      data: {
        id: ID,
        name: 'Praia do Futuro',
        nameKey: 'praia do futuro',
        address: 'Av. Zezé Diogo, 5000',
        latitude: -3.7442,
        longitude: -38.4617,
        createdAt: NOW,
      },
    });
    expect(created.id).toBe(ID);
  });

  it('maps a unique violation to the duplicate conflict', async () => {
    const { location, repository } = setup();
    location.create.mockRejectedValue(uniqueViolation());

    const error = await repository.create(domain()).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toBe('location.name.duplicate');
  });

  it('rethrows any other error', async () => {
    const { location, repository } = setup();
    location.create.mockRejectedValue(new Error('down'));
    await expect(repository.create(domain())).rejects.toThrow('down');

    location.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('other', {
        code: 'P2003',
        clientVersion: 'test',
      }),
    );
    await expect(repository.create(domain())).rejects.toThrow('other');
  });

  describe('update', () => {
    it('writes the location without touching the classes when no deadline is cleared', async () => {
      const { location, schoolClass, prisma, repository } = setup();
      location.update.mockResolvedValue({ ...record(), latitude: 1, longitude: 2 });

      const updated = await repository.update(domain({ latitude: 1, longitude: 2 }), {
        clearDeadlinesFrom: null,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(location.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: {
          name: 'Praia do Futuro',
          nameKey: 'praia do futuro',
          address: 'Av. Zezé Diogo, 5000',
          latitude: 1,
          longitude: 2,
        },
      });
      expect(schoolClass.updateMany).not.toHaveBeenCalled();
      expect([updated.latitude, updated.longitude]).toEqual([1, 2]);
    });

    it('clears the deadlines of the upcoming classes in the same transaction (deadline)', async () => {
      const { location, schoolClass, repository } = setup();
      location.update.mockResolvedValue(record());

      await repository.update(domain(), { clearDeadlinesFrom: NOW });

      expect(schoolClass.updateMany).toHaveBeenCalledWith({
        where: { locationId: ID, startsAt: { gt: NOW }, cancelledAt: null },
        data: {
          cancellationDeadline: null,
          deadlineAttempts: 0,
          deadlineNextAttemptAt: null,
          deadlineRevision: { increment: 1 },
        },
      });
    });

    it('maps a unique violation to the duplicate conflict and rethrows other errors', async () => {
      const { location, repository } = setup();
      location.update.mockRejectedValueOnce(uniqueViolation());
      location.update.mockRejectedValueOnce(new Error('down'));

      const duplicate = await repository.update(domain(), { clearDeadlinesFrom: null }).catch((e) => e);

      expect(duplicate).toBeInstanceOf(ConflictError);
      expect(duplicate.message).toBe('location.name.duplicate');
      await expect(repository.update(domain(), { clearDeadlinesFrom: null })).rejects.toThrow('down');
    });
  });

  it('archives only an active location, nulling its name key, and tells whether it did', async () => {
    const { location, repository } = setup();
    location.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await repository.archive(ID)).toBe(true);
    expect(await repository.archive(ID)).toBe(false);
    expect(location.updateMany).toHaveBeenCalledWith({
      where: { id: ID, archivedAt: null },
      data: { archivedAt: expect.any(Date), nameKey: null },
    });
  });

  it('counts the upcoming classes of each instructor of the location', async () => {
    const { classInstructor, repository } = setup();
    classInstructor.groupBy.mockResolvedValue([
      { userId: 'u-1', _count: { _all: 2 } },
      { userId: 'u-2', _count: { _all: 1 } },
    ]);

    const counts = await repository.findUpcomingInstructorCounts(ID, NOW);

    expect(classInstructor.groupBy).toHaveBeenCalledWith({
      by: ['userId'],
      where: { schoolClass: { locationId: ID, startsAt: { gt: NOW }, cancelledAt: null } },
      _count: { _all: true },
      orderBy: { userId: 'asc' },
    });
    expect(counts).toEqual([
      { instructorId: 'u-1', count: 2 },
      { instructorId: 'u-2', count: 1 },
    ]);
  });
});
