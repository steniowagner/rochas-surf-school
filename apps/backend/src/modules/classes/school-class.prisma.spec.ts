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
  };
  const classInstructor = {
    createMany: vi.fn(async () => calls.push('instructors')),
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
    });
    expect(classes[0].startsAt).toEqual(STARTS_AT);
  });
});
