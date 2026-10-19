import { PrismaService } from '../../db/prisma.service.js';
import { PrismaClassRosterReader } from './class-roster-reader.prisma.js';

function student(index: number) {
  return { id: `s-${index}`, name: `Aluno ${index}`, photoUrl: index % 2 === 0 ? null : `https://img/${index}` };
}

function row(classId: string, index: number) {
  return { classId, student: student(index) };
}

function setup() {
  const enrolment = { findMany: vi.fn() };
  const reader = new PrismaClassRosterReader({ enrolment } as unknown as PrismaService);

  return { enrolment, reader };
}

describe('PrismaClassRosterReader', () => {
  it('reads the approved enrolments in approval order and answers the seats and the students per class', async () => {
    const { enrolment, reader } = setup();
    enrolment.findMany.mockResolvedValue([row('c-1', 1), row('c-2', 5), row('c-1', 2), row('c-1', 3)]);

    const out = await reader.findRosters(['c-1', 'c-2', 'c-3']);

    expect(enrolment.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['c-1', 'c-2', 'c-3'] }, status: 'approved' },
      select: { classId: true, student: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: [{ decidedAt: { sort: 'asc', nulls: 'last' } }, { studentId: 'asc' }],
    });
    expect(out.get('c-1')).toEqual({ seatsTaken: 3, students: [student(1), student(2), student(3)] });
    expect(out.get('c-2')).toEqual({ seatsTaken: 1, students: [student(5)] });
    expect(out.has('c-3')).toBe(false);
  });

  it('keeps the first students asked for and never caps the seats taken', async () => {
    const { enrolment, reader } = setup();
    enrolment.findMany.mockResolvedValue([1, 2, 3, 4, 5, 6, 7].map((index) => row('c-1', index)));

    const out = await reader.findRosters(['c-1'], 4);

    expect(out.get('c-1')).toEqual({
      seatsTaken: 7,
      students: [1, 2, 3, 4].map(student),
    });
  });

  it('reads nothing for no classes', async () => {
    const { enrolment, reader } = setup();

    expect((await reader.findRosters([])).size).toBe(0);
    expect(enrolment.findMany).not.toHaveBeenCalled();
  });
});
