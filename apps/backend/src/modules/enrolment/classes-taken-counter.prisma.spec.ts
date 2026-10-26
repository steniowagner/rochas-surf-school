import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaClassesTakenCounter } from './classes-taken-counter.prisma.js';

const ANA = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const BIA = '1c9f5a3e-77b0-4f0e-8d3a-5b6c7d8e9f01';
const NOW = new Date('2026-10-26T12:00:00.000Z');

function setup() {
  const $queryRaw = vi.fn();
  const counter = new PrismaClassesTakenCounter({ $queryRaw } as unknown as PrismaService);
  return { $queryRaw, counter };
}

describe('PrismaClassesTakenCounter', () => {
  it('counts the ended, not cancelled classes whose latest enrolment is approved, grouped by student', async () => {
    const { $queryRaw, counter } = setup();
    $queryRaw.mockResolvedValueOnce([{ student_id: ANA, taken: 2 }]);

    expect(await counter.countTaken([ANA, BIA], NOW)).toEqual({ [ANA]: 2, [BIA]: 0 });

    expect($queryRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = $queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    const query = Prisma.sql(strings, ...values);
    expect(query.sql.replace(/\s+/g, ' ').trim()).toBe(
      'SELECT latest.student_id, COUNT(*)::int AS taken FROM ( ' +
        'SELECT DISTINCT ON (e.student_id, e.class_id) e.student_id, e.class_id, e.status FROM enrolments e ' +
        'WHERE e.student_id = ANY(?::uuid[]) ' +
        'ORDER BY e.student_id, e.class_id, e.requested_at DESC, e.id DESC ) latest ' +
        'JOIN classes c ON c.id = latest.class_id ' +
        "WHERE latest.status = 'approved' AND c.cancelled_at IS NULL AND c.ends_at <= ? " +
        'GROUP BY latest.student_id',
    );
    expect(query.values).toEqual([[ANA, BIA], NOW]);
  });

  it('answers 0 for everyone when nothing was taken', async () => {
    const { $queryRaw, counter } = setup();
    $queryRaw.mockResolvedValueOnce([]);

    expect(await counter.countTaken([ANA], NOW)).toEqual({ [ANA]: 0 });
  });

  it('asks nothing for no ids', async () => {
    const { $queryRaw, counter } = setup();

    expect(await counter.countTaken([], NOW)).toEqual({});
    expect($queryRaw).not.toHaveBeenCalled();
  });
});
