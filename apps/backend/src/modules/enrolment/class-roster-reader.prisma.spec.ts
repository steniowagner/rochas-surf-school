import { PrismaService } from '../../db/prisma.service.js';
import { PrismaClassRosterReader } from './class-roster-reader.prisma.js';

function student(index: number) {
  return { id: `s-${index}`, name: `Aluno ${index}`, photoUrl: index % 2 === 0 ? null : `https://img/${index}` };
}

function withEnrolment(index: number) {
  return { ...student(index), enrolmentId: `e-${index}` };
}

function row(classId: string, index: number) {
  return { id: `e-${index}`, classId, student: student(index) };
}

function setup() {
  const enrolment = { findMany: vi.fn() };
  const guest = { findMany: vi.fn(async () => [] as unknown[]) };
  const reader = new PrismaClassRosterReader({ enrolment, guest } as unknown as PrismaService);

  return { enrolment, guest, reader };
}

describe('PrismaClassRosterReader', () => {
  it('reads the approved enrolments in approval order and answers the seats and the students per class', async () => {
    const { enrolment, reader } = setup();
    enrolment.findMany.mockResolvedValue([row('c-1', 1), row('c-2', 5), row('c-1', 2), row('c-1', 3)]);

    const out = await reader.findRosters(['c-1', 'c-2', 'c-3']);

    expect(enrolment.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['c-1', 'c-2', 'c-3'] }, status: 'approved' },
      select: { id: true, classId: true, student: { select: { id: true, name: true, photoUrl: true } } },
      orderBy: [{ decidedAt: { sort: 'asc', nulls: 'last' } }, { studentId: 'asc' }],
    });
    expect(out.get('c-1')).toEqual({ seatsTaken: 3, students: [1, 2, 3].map(withEnrolment), guests: [] });
    expect(out.get('c-2')).toEqual({ seatsTaken: 1, students: [withEnrolment(5)], guests: [] });
    expect(out.has('c-3')).toBe(false);
  });

  it('passes an erased student through with a null name, keeping the id, the enrolment and the seat', async () => {
    const { enrolment, reader } = setup();
    enrolment.findMany.mockResolvedValue([
      row('c-1', 1),
      { id: 'e-erased', classId: 'c-1', student: { id: 's-erased', name: null, photoUrl: null } },
    ]);

    const out = await reader.findRosters(['c-1']);

    expect(out.get('c-1')).toEqual({
      seatsTaken: 2,
      students: [withEnrolment(1), { id: 's-erased', name: null, photoUrl: null, enrolmentId: 'e-erased' }],
      guests: [],
    });
  });

  it('keeps the first students asked for and never caps the seats taken', async () => {
    const { enrolment, reader } = setup();
    enrolment.findMany.mockResolvedValue([1, 2, 3, 4, 5, 6, 7].map((index) => row('c-1', index)));

    const out = await reader.findRosters(['c-1'], 4);

    expect(out.get('c-1')).toEqual({
      seatsTaken: 7,
      students: [1, 2, 3, 4].map(withEnrolment),
      guests: [],
    });
  });

  it('reads the guests in the order they were added and counts them as seats, uncapped', async () => {
    const { enrolment, guest, reader } = setup();
    enrolment.findMany.mockResolvedValue([row('c-1', 1)]);
    guest.findMany.mockResolvedValue([
      { id: 'g-1', classId: 'c-1', name: 'Carolina Reis' },
      { id: 'g-2', classId: 'c-1', name: null },
      { id: 'g-3', classId: 'c-2', name: 'Bia Lima' },
    ]);

    const out = await reader.findRosters(['c-1', 'c-2'], 0);

    expect(guest.findMany).toHaveBeenCalledWith({
      where: { classId: { in: ['c-1', 'c-2'] } },
      select: { id: true, classId: true, name: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    expect(out.get('c-1')).toEqual({
      seatsTaken: 3,
      students: [],
      guests: [
        { id: 'g-1', name: 'Carolina Reis' },
        { id: 'g-2', name: null },
      ],
    });
    expect(out.get('c-2')).toEqual({ seatsTaken: 1, students: [], guests: [{ id: 'g-3', name: 'Bia Lima' }] });
  });

  it('reads nothing for no classes', async () => {
    const { enrolment, guest, reader } = setup();

    expect((await reader.findRosters([])).size).toBe(0);
    expect(enrolment.findMany).not.toHaveBeenCalled();
    expect(guest.findMany).not.toHaveBeenCalled();
  });
});
