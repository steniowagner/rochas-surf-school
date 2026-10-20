import { PrismaService } from '../../db/prisma.service.js';
import { PrismaSeatCounter } from './seat-counter.prisma.js';

describe('PrismaSeatCounter', () => {
  it('counts the approved enrolments of the class', async () => {
    const enrolment = { count: vi.fn(async () => 2) };
    const counter = new PrismaSeatCounter({ enrolment } as unknown as PrismaService);

    expect(await counter.countSeatsTaken('c-1')).toBe(2);
    expect(enrolment.count).toHaveBeenCalledWith({ where: { classId: 'c-1', status: 'approved' } });
  });
});
