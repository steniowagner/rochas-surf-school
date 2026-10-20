import { PrismaService } from '../../db/prisma.service.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';

const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');
const ENDS_AT = new Date('2026-10-19T12:00:00.000Z');

function record() {
  return {
    id: 'c-1',
    discipline: 'surf',
    startsAt: STARTS_AT,
    endsAt: ENDS_AT,
    capacity: 8,
    cancelledAt: null,
    instructors: [{ userId: 'i-1' }, { userId: 'i-2' }],
  };
}

function setup() {
  const schoolClass = { findUnique: vi.fn() };
  const cancellationRule = { findUnique: vi.fn() };
  const reader = new PrismaEnrolmentClassReader({
    schoolClass,
    cancellationRule,
  } as unknown as PrismaService);

  return { schoolClass, cancellationRule, reader };
}

describe('PrismaEnrolmentClassReader', () => {
  it('reads the class with its instructors and whether its discipline has a rule', async () => {
    const { schoolClass, cancellationRule, reader } = setup();
    schoolClass.findUnique.mockResolvedValue(record());
    cancellationRule.findUnique.mockResolvedValue({ discipline: 'surf' });

    expect(await reader.findById('c-1')).toEqual({
      id: 'c-1',
      discipline: 'surf',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      capacity: 8,
      cancelledAt: null,
      instructorIds: ['i-1', 'i-2'],
      hasCancellationRule: true,
    });
    expect(cancellationRule.findUnique).toHaveBeenCalledWith({
      where: { discipline: 'surf' },
      select: { discipline: true },
    });
  });

  it('says there is no rule when the discipline has none', async () => {
    const { schoolClass, cancellationRule, reader } = setup();
    schoolClass.findUnique.mockResolvedValue({ ...record(), cancelledAt: ENDS_AT });
    cancellationRule.findUnique.mockResolvedValue(null);

    expect(await reader.findById('c-1')).toMatchObject({
      cancelledAt: ENDS_AT,
      hasCancellationRule: false,
    });
  });

  it('answers null for an unknown class without reading rules', async () => {
    const { schoolClass, cancellationRule, reader } = setup();
    schoolClass.findUnique.mockResolvedValue(null);

    expect(await reader.findById('c-1')).toBeNull();
    expect(cancellationRule.findUnique).not.toHaveBeenCalled();
  });
});
