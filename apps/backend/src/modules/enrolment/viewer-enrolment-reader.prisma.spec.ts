import { PrismaService } from '../../db/prisma.service.js';
import { PrismaViewerEnrolmentReader } from './viewer-enrolment-reader.prisma.js';

const NEWER = new Date('2026-10-18T13:00:00.000Z');
const OLDER = new Date('2026-10-18T12:00:00.000Z');

function setup() {
  const enrolment = { findMany: vi.fn() };
  const reader = new PrismaViewerEnrolmentReader({ enrolment } as unknown as PrismaService);

  return { enrolment, reader };
}

describe('PrismaViewerEnrolmentReader', () => {
  it('keeps the latest enrolment of each class (newest first by request, then id)', async () => {
    const { enrolment, reader } = setup();
    enrolment.findMany.mockResolvedValue([
      { id: 'e-3', classId: 'c-1', status: 'pending', requestedAt: NEWER },
      { id: 'e-2', classId: 'c-2', status: 'withdrawn', requestedAt: NEWER },
      { id: 'e-1', classId: 'c-1', status: 'expired', requestedAt: OLDER },
    ]);

    const out = await reader.findLatest('u-1', ['c-1', 'c-2', 'c-3']);

    expect(enrolment.findMany).toHaveBeenCalledWith({
      where: { studentId: 'u-1', classId: { in: ['c-1', 'c-2', 'c-3'] } },
      select: { id: true, classId: true, status: true, requestedAt: true },
      orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
    });
    expect(out.get('c-1')).toEqual({ id: 'e-3', status: 'pending', requestedAt: NEWER });
    expect(out.get('c-2')).toEqual({ id: 'e-2', status: 'withdrawn', requestedAt: NEWER });
    expect(out.has('c-3')).toBe(false);
  });

  it('reads nothing for no classes', async () => {
    const { enrolment, reader } = setup();

    expect((await reader.findLatest('u-1', [])).size).toBe(0);
    expect(enrolment.findMany).not.toHaveBeenCalled();
  });
});
