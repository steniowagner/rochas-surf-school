import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaMyClassesReader } from './my-classes-reader.prisma.js';

const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const NOW = new Date('2026-10-15T11:30:00.000Z');

function setup() {
  const schoolClass = { findMany: vi.fn() };
  const $queryRaw = vi.fn();
  const reader = new PrismaMyClassesReader({ schoolClass, $queryRaw } as unknown as PrismaService);
  return { schoolClass, $queryRaw, reader };
}

/** The SQL text and bound values of the nth raw query, as Postgres would receive them. */
function sqlOf($queryRaw: ReturnType<typeof vi.fn>, call: number) {
  const [strings, ...values] = $queryRaw.mock.calls[call] as [TemplateStringsArray, ...unknown[]];
  const query = Prisma.sql(strings, ...values);
  return { text: query.sql.replace(/\s+/g, ' ').trim(), values: query.values };
}

const FROM =
  'FROM classes c JOIN ( SELECT DISTINCT ON (e.class_id) e.class_id, e.status FROM enrolments e ' +
  'WHERE e.student_id = ?::uuid ORDER BY e.class_id, e.requested_at DESC, e.id DESC ) latest ' +
  "ON latest.class_id = c.id WHERE latest.status = 'approved' AND c.cancelled_at IS NULL AND c.ends_at <= ?";

describe('PrismaMyClassesReader', () => {
  it('lists the not-finished classes where the student has any enrolment, by start then id', async () => {
    const { schoolClass, reader } = setup();
    schoolClass.findMany.mockResolvedValue([{ id: 'c-1' }, { id: 'c-2' }]);

    expect(await reader.findCurrentClassIds(STUDENT_ID, NOW)).toEqual(['c-1', 'c-2']);
    expect(schoolClass.findMany).toHaveBeenCalledWith({
      where: { endsAt: { gt: NOW }, enrolments: { some: { studentId: STUDENT_ID } } },
      select: { id: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('pages the finished, not cancelled classes whose latest enrolment is approved, newest first', async () => {
    const { $queryRaw, reader } = setup();
    $queryRaw.mockResolvedValueOnce([{ id: 'c-9' }, { id: 'c-8' }]).mockResolvedValueOnce([{ total: 25n }]);

    expect(await reader.findHistoryClassIds(STUDENT_ID, NOW, 2, 20)).toEqual({
      ids: ['c-9', 'c-8'],
      total: 25,
    });
    expect(sqlOf($queryRaw, 0)).toEqual({
      text: `SELECT c.id ${FROM} ORDER BY c.starts_at DESC, c.id DESC LIMIT ? OFFSET ?`,
      values: [STUDENT_ID, NOW, 20, 20],
    });
    expect(sqlOf($queryRaw, 1)).toEqual({
      text: `SELECT COUNT(*) AS total ${FROM}`,
      values: [STUDENT_ID, NOW],
    });
  });

  it('starts the first page at offset 0', async () => {
    const { $queryRaw, reader } = setup();
    $queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

    expect(await reader.findHistoryClassIds(STUDENT_ID, NOW, 1, 50)).toEqual({ ids: [], total: 0 });
    expect(sqlOf($queryRaw, 0).values).toEqual([STUDENT_ID, NOW, 50, 0]);
  });
});
