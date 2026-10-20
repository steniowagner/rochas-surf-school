import { PrismaService } from '../../db/prisma.service.js';
import { PrismaPendingRequestCounter } from './pending-request-counter.prisma.js';

describe('PrismaPendingRequestCounter', () => {
  it('counts the pending enrolments of the class', async () => {
    const enrolment = { count: vi.fn(async () => 3) };
    const counter = new PrismaPendingRequestCounter({ enrolment } as unknown as PrismaService);

    expect(await counter.countPendingRequests('c-1')).toBe(3);
    expect(enrolment.count).toHaveBeenCalledWith({ where: { classId: 'c-1', status: 'pending' } });
  });
});
