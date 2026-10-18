import { SchoolClass } from '@rochas-surf-school/classes';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const OTHER_ID = '4d0d2c0f-2a6f-4e9f-8b4c-7a8f9e0d1c2b';
const LOCATION_ID = 'c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e65';
const INSTRUCTOR_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const NOW = new Date('2026-10-14T12:00:00.000Z');
const STARTS_AT = new Date('2026-10-15T11:00:00.000Z');
const ENDS_AT = new Date('2026-10-15T12:00:00.000Z');
const CANCELLED_AT = new Date('2026-10-14T13:00:00.000Z');

function domain(id = ID, notes: string | null = 'Bring sunscreen') {
  return new SchoolClass({
    id,
    discipline: 'surf',
    level: 'beginner',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    locationId: LOCATION_ID,
    instructorIds: [INSTRUCTOR_ID, ADMIN_ID],
    capacity: 8,
    notes,
    createdBy: ADMIN_ID,
    createdAt: NOW,
  });
}

function setup() {
  const calls: string[] = [];
  const schoolClass = {
    createMany: vi.fn(async () => calls.push('classes')),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(async () => {
      calls.push('class');
      return { count: 1 };
    }),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  };
  const classInstructor = {
    createMany: vi.fn(async () => calls.push('instructors')),
    deleteMany: vi.fn(async () => calls.push('unassign')),
  };
  const prisma = {
    schoolClass,
    classInstructor,
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) =>
      work({ schoolClass, classInstructor }),
    ),
  };
  const repository = new PrismaSchoolClassRepository(prisma as unknown as PrismaService);
  return { schoolClass, classInstructor, prisma, calls, repository };
}

describe('PrismaSchoolClassRepository', () => {
  it('writes the classes and their instructors in one transaction', async () => {
    const { schoolClass, classInstructor, prisma, calls, repository } = setup();

    await repository.createMany([domain(ID), domain(OTHER_ID, null)]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['classes', 'instructors']);
    expect(schoolClass.createMany).toHaveBeenCalledWith({
      data: [
        {
          id: ID,
          discipline: 'surf',
          level: 'beginner',
          startsAt: STARTS_AT,
          endsAt: ENDS_AT,
          locationId: LOCATION_ID,
          capacity: 8,
          notes: 'Bring sunscreen',
          createdBy: ADMIN_ID,
          createdAt: NOW,
        },
        expect.objectContaining({ id: OTHER_ID, notes: null }),
      ],
    });
    expect(classInstructor.createMany).toHaveBeenCalledWith({
      data: [
        { classId: ID, userId: INSTRUCTOR_ID },
        { classId: ID, userId: ADMIN_ID },
        { classId: OTHER_ID, userId: INSTRUCTOR_ID },
        { classId: OTHER_ID, userId: ADMIN_ID },
      ],
    });
  });

  it('propagates a failure so the transaction rolls back', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.createMany.mockRejectedValue(new Error('down'));

    await expect(repository.createMany([domain()])).rejects.toThrow('down');
  });

  it('finds the classes starting in [from, to) with their instructors', async () => {
    const { schoolClass, repository } = setup();
    const from = new Date('2026-10-05T03:00:00.000Z');
    const to = new Date('2026-10-12T03:00:00.000Z');
    schoolClass.findMany.mockResolvedValue([
      {
        id: ID,
        discipline: 'skate',
        level: 'expert',
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        locationId: LOCATION_ID,
        capacity: 5,
        notes: null,
        cancelledAt: CANCELLED_AT,
        cancellationMessage: 'Mar muito grande.',
        createdBy: ADMIN_ID,
        createdAt: NOW,
        updatedAt: NOW,
        instructors: [{ userId: INSTRUCTOR_ID }],
      },
    ]);

    const classes = await repository.findStartingBetween(from, to);

    expect(schoolClass.findMany).toHaveBeenCalledWith({
      where: { startsAt: { gte: from, lt: to } },
      include: { instructors: { select: { userId: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    expect(classes).toHaveLength(1);
    expect(classes[0]).toMatchObject({
      id: ID,
      discipline: 'skate',
      level: 'expert',
      instructorIds: [INSTRUCTOR_ID],
      capacity: 5,
      notes: null,
      cancelledAt: CANCELLED_AT,
      cancellationMessage: 'Mar muito grande.',
    });
    expect(classes[0].startsAt).toEqual(STARTS_AT);
  });

  it('finds a class by id with its instructors, or null', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.findUnique
      .mockResolvedValueOnce({
        id: ID,
        discipline: 'surf',
        level: 'beginner',
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        locationId: LOCATION_ID,
        capacity: 8,
        notes: 'Bring sunscreen',
        createdBy: ADMIN_ID,
        createdAt: NOW,
        updatedAt: NOW,
        instructors: [{ userId: INSTRUCTOR_ID }, { userId: ADMIN_ID }],
      })
      .mockResolvedValueOnce(null);

    const found = await repository.findById(ID);

    expect(schoolClass.findUnique).toHaveBeenCalledWith({
      where: { id: ID },
      include: { instructors: { select: { userId: true } } },
    });
    expect(found).toMatchObject({ id: ID, instructorIds: [INSTRUCTOR_ID, ADMIN_ID], capacity: 8 });
    expect(await repository.findById(OTHER_ID)).toBeNull();
  });

  it('updates the class row and replaces its instructors in one transaction', async () => {
    const { schoolClass, classInstructor, prisma, calls, repository } = setup();
    const edited = domain().clone({
      capacity: 12,
      notes: null,
      instructorIds: [ADMIN_ID],
      updatedAt: NOW,
    });

    expect(await repository.update(edited, false)).toBe(true);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['class', 'unassign', 'instructors']);
    expect(schoolClass.updateMany).toHaveBeenCalledWith({
      where: { id: ID, cancelledAt: null },
      data: {
        discipline: 'surf',
        level: 'beginner',
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        locationId: LOCATION_ID,
        capacity: 12,
        notes: null,
        updatedAt: NOW,
      },
    });
    expect(classInstructor.deleteMany).toHaveBeenCalledWith({ where: { classId: ID } });
    expect(classInstructor.createMany).toHaveBeenCalledWith({
      data: [{ classId: ID, userId: ADMIN_ID }],
    });
  });

  it('clears the deadline in the same write when told to (deadline)', async () => {
    const { schoolClass, repository } = setup();

    expect(await repository.update(domain(), true)).toBe(true);

    expect(schoolClass.updateMany).toHaveBeenCalledWith({
      where: { id: ID, cancelledAt: null },
      data: expect.objectContaining({
        cancellationDeadline: null,
        deadlineAttempts: 0,
        deadlineNextAttemptAt: null,
        deadlineRevision: { increment: 1 },
      }),
    });
  });

  it('leaves the deadline columns out of an update that keeps it (deadline)', async () => {
    const { schoolClass, repository } = setup();

    await repository.update(domain(), false);

    const [{ data }] = schoolClass.updateMany.mock.calls[0] as unknown as [{ data: object }];
    expect(Object.keys(data)).not.toContain('cancellationDeadline');
    expect(Object.keys(data)).not.toContain('deadlineRevision');
  });

  it('reads the deadline fields of a class (deadline)', async () => {
    const { schoolClass, repository } = setup();
    const deadline = new Date('2026-10-14T23:00:00.000Z');
    const next = new Date('2026-10-14T12:05:00.000Z');
    schoolClass.findUnique.mockResolvedValueOnce({
      id: ID,
      discipline: 'surf',
      level: 'beginner',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      locationId: LOCATION_ID,
      capacity: 8,
      notes: null,
      cancelledAt: null,
      cancellationMessage: null,
      cancellationDeadline: deadline,
      deadlineRevision: 2,
      deadlineAttempts: 3,
      deadlineNextAttemptAt: next,
      createdBy: ADMIN_ID,
      createdAt: NOW,
      updatedAt: NOW,
      instructors: [{ userId: INSTRUCTOR_ID }],
    });

    expect(await repository.findById(ID)).toMatchObject({
      cancellationDeadline: deadline,
      deadlineRevision: 2,
      deadlineAttempts: 3,
      deadlineNextAttemptAt: next,
    });
  });

  it('finds the classes needing a deadline, never-tried first (deadline)', async () => {
    const { schoolClass, repository } = setup();
    const row = (id: string) => ({
      id,
      discipline: 'surf',
      level: 'beginner',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      locationId: LOCATION_ID,
      capacity: 8,
      notes: null,
      createdBy: ADMIN_ID,
      createdAt: NOW,
      updatedAt: NOW,
      instructors: [],
    });
    schoolClass.findMany
      .mockResolvedValueOnce([row(ID)])
      .mockResolvedValueOnce([row(OTHER_ID)]);

    const found = await repository.findNeedingDeadline({ now: NOW, disciplines: ['surf'], limit: 20 });

    expect(found.map((item) => item.id)).toEqual([ID, OTHER_ID]);
    const due = {
      discipline: { in: ['surf'] },
      startsAt: { gt: NOW },
      cancelledAt: null,
      cancellationDeadline: null,
      OR: [{ deadlineNextAttemptAt: null }, { deadlineNextAttemptAt: { lte: NOW } }],
    };
    expect(schoolClass.findMany).toHaveBeenNthCalledWith(1, {
      where: { ...due, deadlineAttempts: { equals: 0 } },
      include: { instructors: { select: { userId: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: 20,
    });
    expect(schoolClass.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { ...due, deadlineAttempts: { gt: 0 } }, take: 19 }),
    );
  });

  it('skips the retried classes when the never-tried ones fill the limit (deadline)', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.findMany.mockResolvedValueOnce([
      { id: ID, discipline: 'surf', level: 'beginner', startsAt: STARTS_AT, endsAt: ENDS_AT, locationId: LOCATION_ID, capacity: 8, createdBy: ADMIN_ID, createdAt: NOW, updatedAt: NOW, instructors: [] },
    ]);

    expect(await repository.findNeedingDeadline({ now: NOW, disciplines: ['surf'], limit: 1 })).toHaveLength(1);
    expect(schoolClass.findMany).toHaveBeenCalledTimes(1);
  });

  it('stores a deadline only for the revision it was worked out for (deadline)', async () => {
    const { schoolClass, repository } = setup();
    const deadline = new Date('2026-10-14T23:00:00.000Z');
    schoolClass.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await repository.saveDeadline(ID, 2, deadline)).toBe(true);
    expect(await repository.saveDeadline(ID, 1, deadline)).toBe(false);

    expect(schoolClass.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: ID, deadlineRevision: 2, cancelledAt: null },
      data: { cancellationDeadline: deadline, deadlineAttempts: 0, deadlineNextAttemptAt: null },
    });
  });

  it('records a failed attempt only for the revision it was made for (deadline)', async () => {
    const { schoolClass, repository } = setup();
    const next = new Date('2026-10-14T12:01:00.000Z');
    schoolClass.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await repository.recordDeadlineFailure(ID, 2, 1, next)).toBe(true);
    expect(await repository.recordDeadlineFailure(ID, 3, 1, next)).toBe(false);

    expect(schoolClass.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: ID, deadlineRevision: 2, cancelledAt: null },
      data: { deadlineAttempts: 1, deadlineNextAttemptAt: next },
    });
  });

  it('writes nothing, not even the instructors, when the stored class is cancelled', async () => {
    const { schoolClass, classInstructor, calls, repository } = setup();
    schoolClass.updateMany.mockResolvedValueOnce({ count: 0 });

    expect(await repository.update(domain(), false)).toBe(false);

    expect(calls).toEqual([]);
    expect(classInstructor.deleteMany).not.toHaveBeenCalled();
    expect(classInstructor.createMany).not.toHaveBeenCalled();
  });

  it('reads a class that was never cancelled with no cancellation', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.findUnique.mockResolvedValueOnce({
      id: ID,
      discipline: 'surf',
      level: 'beginner',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      locationId: LOCATION_ID,
      capacity: 8,
      notes: null,
      cancelledAt: null,
      cancellationMessage: null,
      createdBy: ADMIN_ID,
      createdAt: NOW,
      updatedAt: NOW,
      instructors: [{ userId: INSTRUCTOR_ID }],
    });

    expect(await repository.findById(ID)).toMatchObject({
      cancelledAt: null,
      cancellationMessage: null,
    });
  });

  it('cancels with one conditional write and tells whether it won', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await repository.cancel(ID, CANCELLED_AT, 'Mar muito grande.')).toBe(true);
    expect(await repository.cancel(ID, CANCELLED_AT, null)).toBe(false);

    expect(schoolClass.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: ID, cancelledAt: null },
      data: { cancelledAt: CANCELLED_AT, cancellationMessage: 'Mar muito grande.' },
    });
    expect(schoolClass.updateMany).toHaveBeenNthCalledWith(2, {
      where: { id: ID, cancelledAt: null },
      data: { cancelledAt: CANCELLED_AT, cancellationMessage: null },
    });
  });

  it('propagates a cancel failure', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.updateMany.mockRejectedValueOnce(new Error('down'));

    await expect(repository.cancel(ID, CANCELLED_AT, null)).rejects.toThrow('down');
  });

  it('propagates an update failure so the transaction rolls back', async () => {
    const { classInstructor, repository } = setup();
    classInstructor.createMany.mockRejectedValue(new Error('down'));

    await expect(repository.update(domain(), false)).rejects.toThrow('down');
  });

  it('delete removes the class only while it is not cancelled and starts after now', async () => {
    const { schoolClass, repository } = setup();

    expect(await repository.delete(ID, NOW)).toBe(true);

    expect(schoolClass.deleteMany).toHaveBeenCalledWith({
      where: { id: ID, cancelledAt: null, startsAt: { gt: NOW } },
    });
  });

  it('delete answers false when no row matched: cancelled, started or already gone', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.deleteMany.mockResolvedValueOnce({ count: 0 });

    expect(await repository.delete(ID, NOW)).toBe(false);
  });

  it('finds the upcoming, not cancelled classes a person teaches, by start then id', async () => {
    const { schoolClass, repository } = setup();
    schoolClass.findMany.mockResolvedValue([
      {
        id: ID,
        discipline: 'surf',
        level: 'beginner',
        startsAt: STARTS_AT,
        endsAt: ENDS_AT,
        locationId: LOCATION_ID,
        capacity: 8,
        notes: null,
        cancelledAt: null,
        cancellationMessage: null,
        createdBy: ADMIN_ID,
        createdAt: NOW,
        updatedAt: NOW,
        instructors: [{ userId: INSTRUCTOR_ID }, { userId: ADMIN_ID }],
      },
    ]);

    const classes = await repository.findUpcomingTaughtBy(INSTRUCTOR_ID, NOW);

    expect(schoolClass.findMany).toHaveBeenCalledWith({
      where: {
        instructors: { some: { userId: INSTRUCTOR_ID } },
        startsAt: { gt: NOW },
        cancelledAt: null,
      },
      include: { instructors: { select: { userId: true } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
    expect(classes).toHaveLength(1);
    expect(classes[0]).toMatchObject({ id: ID, instructorIds: [INSTRUCTOR_ID, ADMIN_ID] });
  });

  it('removeInstructor deletes only that person\'s rows of those classes in one transaction', async () => {
    const { classInstructor, prisma, repository } = setup();

    await repository.removeInstructor(INSTRUCTOR_ID, [ID, OTHER_ID]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(classInstructor.deleteMany).toHaveBeenCalledWith({
      where: { userId: INSTRUCTOR_ID, classId: { in: [ID, OTHER_ID] } },
    });
  });

  it('removeInstructor writes nothing for no class', async () => {
    const { classInstructor, prisma, repository } = setup();

    await repository.removeInstructor(INSTRUCTOR_ID, []);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(classInstructor.deleteMany).not.toHaveBeenCalled();
  });

  it('removeInstructor propagates a failure so the transaction rolls back', async () => {
    const { classInstructor, repository } = setup();
    classInstructor.deleteMany.mockRejectedValueOnce(new Error('db down'));

    await expect(repository.removeInstructor(INSTRUCTOR_ID, [ID])).rejects.toThrow('db down');
  });
});
