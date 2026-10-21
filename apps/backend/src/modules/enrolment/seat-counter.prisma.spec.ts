import { PrismaService } from '../../db/prisma.service.js';
import { PrismaSeatCounter } from './seat-counter.prisma.js';

describe('PrismaSeatCounter', () => {
  it('counts the approved enrolments of the class plus its guests', async () => {
    const enrolment = { count: vi.fn(async () => 2) };
    const guest = { count: vi.fn(async () => 1) };
    const counter = new PrismaSeatCounter({ enrolment, guest } as unknown as PrismaService);

    expect(await counter.countSeatsTaken('c-1')).toBe(3);
    expect(enrolment.count).toHaveBeenCalledWith({ where: { classId: 'c-1', status: 'approved' } });
    expect(guest.count).toHaveBeenCalledWith({ where: { classId: 'c-1' } });
  });
});
