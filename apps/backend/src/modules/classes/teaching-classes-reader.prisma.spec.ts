import { PrismaService } from '../../db/prisma.service.js';
import { PrismaTeachingClassesReader } from './teaching-classes-reader.prisma.js';

const TEACHER_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const NOW = new Date('2026-10-15T11:30:00.000Z');

function setup() {
  const schoolClass = { findMany: vi.fn() };
  const classInstructor = { findFirst: vi.fn() };
  const reader = new PrismaTeachingClassesReader({ schoolClass, classInstructor } as unknown as PrismaService);
  return { schoolClass, classInstructor, reader };
}

describe('PrismaTeachingClassesReader', () => {
  it('lists the classes that have not ended where the person is an instructor, by start then id', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);

    expect(await reader.findCurrentClassIds(TEACHER_ID, NOW)).toEqual(['c-1', 'c-2']);
    expect(schoolClass.findMany).toHaveBeenCalledWith({
      where: { endsAt: { gt: NOW }, instructors: { some: { userId: TEACHER_ID } } },
      select: { id: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('lists the classes taught in the period: ended, not cancelled, newest first', async () => {
    const { schoolClass, reader } = setup();
    const from = new Date('2026-08-01T03:00:00.000Z');
    const to = new Date('2026-09-01T03:00:00.000Z');
    schoolClass.findMany.mockResolvedValue([{ id: 'c-2' }, { id: 'c-1' }]);

    expect(await reader.findHistoryClassIds(TEACHER_ID, NOW, from, to)).toEqual(['c-2', 'c-1']);
    expect(schoolClass.findMany).toHaveBeenCalledWith({
      where: {
        endsAt: { lte: NOW },
        cancelledAt: null,
        startsAt: { gte: from, lt: to },
        instructors: { some: { userId: TEACHER_ID } },
      },
      select: { id: true },
      orderBy: [{ startsAt: 'desc' }, { id: 'desc' }],
    });
  });

  it('answers that the person teaches when they are an instructor of any class', async () => {
    const { classInstructor, reader } = setup();
    classInstructor.findFirst.mockResolvedValue({ classId: 'c-1' });

    expect(await reader.teachesAny(TEACHER_ID)).toBe(true);
    expect(classInstructor.findFirst).toHaveBeenCalledWith({
      where: { userId: TEACHER_ID },
      select: { classId: true },
    });
  });

  it('answers that the person teaches nothing without any class', async () => {
    const { classInstructor, reader } = setup();
    classInstructor.findFirst.mockResolvedValue(null);

    expect(await reader.teachesAny(TEACHER_ID)).toBe(false);
  });
});
