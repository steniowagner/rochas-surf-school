import { PrismaService } from '../../db/prisma.service.js';
import { PrismaClassAudienceReader } from './class-audience-reader.prisma.js';

function setup(records: unknown[]) {
  const enrolment = { findMany: vi.fn(async () => records) };

  return { enrolment, reader: new PrismaClassAudienceReader({ enrolment } as unknown as PrismaService) };
}

describe('PrismaClassAudienceReader', () => {
  it('reads the students with an approved or pending enrolment in the class, each once', async () => {
    const { enrolment, reader } = setup([{ studentId: 's-1' }, { studentId: 's-2' }]);

    expect(await reader.findClassAudience('c-1')).toEqual(['s-1', 's-2']);
    expect(enrolment.findMany).toHaveBeenCalledWith({
      where: { classId: 'c-1', status: { in: ['approved', 'pending'] } },
      select: { studentId: true },
      distinct: ['studentId'],
      orderBy: { studentId: 'asc' },
    });
  });

  it('counts the upcoming, not cancelled classes of the location each student is in', async () => {
    const now = new Date('2026-10-21T12:00:00.000Z');
    const { enrolment, reader } = setup([
      { studentId: 's-1', classId: 'c-1' },
      { studentId: 's-1', classId: 'c-2' },
      { studentId: 's-2', classId: 'c-1' },
    ]);

    expect(await reader.findLocationAudience('l-1', now)).toEqual([
      { userId: 's-1', count: 2 },
      { userId: 's-2', count: 1 },
    ]);
    expect(enrolment.findMany).toHaveBeenCalledWith({
      where: {
        status: { in: ['approved', 'pending'] },
        schoolClass: { locationId: 'l-1', cancelledAt: null, startsAt: { gt: now } },
      },
      select: { studentId: true, classId: true },
      distinct: ['studentId', 'classId'],
      orderBy: { studentId: 'asc' },
    });
  });

  it('answers nobody when no enrolment matches', async () => {
    expect(await setup([]).reader.findLocationAudience('l-1', new Date())).toEqual([]);
  });
});
