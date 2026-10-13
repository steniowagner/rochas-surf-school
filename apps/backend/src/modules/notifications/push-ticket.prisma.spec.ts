import { PrismaService } from '../../db/prisma.service.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';

const NOW = new Date('2026-10-12T12:00:00.000Z');

function setup() {
  const pushTicket = { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() };
  const repository = new PrismaPushTicketRepository({ pushTicket } as unknown as PrismaService);
  return { pushTicket, repository };
}

describe('PrismaPushTicketRepository', () => {
  it('stores the tickets, ignoring a repeated id', async () => {
    const { pushTicket, repository } = setup();

    await repository.createMany([{ id: 'k1', token: 'ExpoPushToken[a]', createdAt: NOW }]);

    expect(pushTicket.createMany).toHaveBeenCalledWith({
      data: [{ id: 'k1', token: 'ExpoPushToken[a]', createdAt: NOW }],
      skipDuplicates: true,
    });
  });

  it('finds the tickets created at or before a date, oldest first', async () => {
    const { pushTicket, repository } = setup();
    pushTicket.findMany.mockResolvedValue([
      { id: 'k1', token: 'ExpoPushToken[a]', createdAt: NOW },
    ]);

    await expect(repository.findCreatedBefore(NOW)).resolves.toEqual([
      { id: 'k1', token: 'ExpoPushToken[a]', createdAt: NOW },
    ]);
    expect(pushTicket.findMany).toHaveBeenCalledWith({
      where: { createdAt: { lte: NOW } },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('deletes by ids', async () => {
    const { pushTicket, repository } = setup();

    await repository.deleteByIds(['k1', 'k2']);

    expect(pushTicket.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['k1', 'k2'] } } });
  });
});
