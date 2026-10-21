import { PrismaService } from '../../db/prisma.service.js';
import { PrismaClassViewReader } from './class-view-reader.prisma.js';

const STARTS_AT = new Date('2026-10-15T11:00:00.000Z');
const ENDS_AT = new Date('2026-10-15T12:00:00.000Z');

function record(notes: string | null = 'Bring sunscreen') {
  return {
    id: 'class-1',
    discipline: 'surf',
    level: 'beginner',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    capacity: 8,
    notes,
    cancelledAt: null,
    cancellationMessage: null,
    cancellationDeadline: new Date('2026-10-14T23:00:00.000Z'),
    location: {
      id: 'loc-1',
      name: 'Praia do Futuro',
      address: 'Av. Zezé Diogo, 1000',
      latitude: -3.7442,
      longitude: -38.4617,
    },
    instructors: [{ user: { id: 'u-1', name: 'Ana' } }, { user: { id: 'u-2', name: 'Bruno' } }],
  };
}

function setup() {
  const schoolClass = { findMany: vi.fn(), findUnique: vi.fn() };
  const reader = new PrismaClassViewReader({ schoolClass } as unknown as PrismaService);
  return { schoolClass, reader };
}

const VIEW = {
  id: 'class-1',
  discipline: 'surf',
  level: 'beginner',
  startsAt: STARTS_AT,
  endsAt: ENDS_AT,
  capacity: 8,
  notes: 'Bring sunscreen',
  cancelledAt: null,
  cancellationMessage: null,
  cancellationDeadline: new Date('2026-10-14T23:00:00.000Z'),
  location: {
      id: 'loc-1',
      name: 'Praia do Futuro',
      address: 'Av. Zezé Diogo, 1000',
      latitude: -3.7442,
      longitude: -38.4617,
    },
  instructors: [
    { id: 'u-1', name: 'Ana' },
    { id: 'u-2', name: 'Bruno' },
  ],
};

describe('PrismaClassViewReader', () => {
  it('lists the classes starting in the range with one query, in order', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findMany.mockResolvedValue([record()]);
    const from = new Date('2026-10-12T03:00:00.000Z');
    const to = new Date('2026-10-19T03:00:00.000Z');

    const items = await reader.findStartingBetween(from, to);

    expect(schoolClass.findMany).toHaveBeenCalledTimes(1);
    expect(schoolClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { startsAt: { gte: from, lt: to } },
        orderBy: [{ startsAt: 'asc' }, { endsAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(items).toEqual([VIEW]);
  });

  it('finds one class by id with its location and instructors', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findUnique.mockResolvedValue(record(null));

    const item = await reader.findById('class-1');

    expect(schoolClass.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'class-1' } }),
    );
    expect(item).toEqual({ ...VIEW, notes: null });
  });

  it('finds the classes with the given ids in one query', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findMany.mockResolvedValue([record()]);

    expect(await reader.findByIds(['class-1', 'gone'])).toEqual([VIEW]);
    expect(schoolClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['class-1', 'gone'] } } }),
    );
  });

  it('reads nothing for no ids', async () => {
    const { schoolClass, reader } = setup();

    expect(await reader.findByIds([])).toEqual([]);
    expect(schoolClass.findMany).not.toHaveBeenCalled();
  });

  it('answers null when there is no class with the id', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findUnique.mockResolvedValue(null);

    expect(await reader.findById('nope')).toBeNull();
  });

  it('selects the location point and passes a missing one through as null', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findUnique.mockResolvedValue({
      ...record(),
      location: { id: 'loc-1', name: 'Antigo', address: 'Rua A', latitude: null, longitude: null },
    });

    const item = await reader.findById('class-1');

    expect(schoolClass.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          location: {
            select: { id: true, name: true, address: true, latitude: true, longitude: true },
          },
        }),
      }),
    );
    expect(item?.location).toEqual({
      id: 'loc-1',
      name: 'Antigo',
      address: 'Rua A',
      latitude: null,
      longitude: null,
    });
  });

  it('maps the cancellation of a cancelled class', async () => {
    const { schoolClass, reader } = setup();
    const cancelledAt = new Date('2026-10-14T13:00:00.000Z');
    schoolClass.findUnique.mockResolvedValue({
      ...record(),
      cancelledAt,
      cancellationMessage: 'Mar muito grande.',
    });

    expect(await reader.findById('class-1')).toMatchObject({
      cancelledAt,
      cancellationMessage: 'Mar muito grande.',
    });
  });
});
