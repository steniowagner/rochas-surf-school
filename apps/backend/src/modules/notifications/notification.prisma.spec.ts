import { Notification } from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaNotificationRepository } from './notification.prisma.js';

const USER_ID = '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e';
const NOW = new Date('2026-10-12T12:00:00.000Z');

describe('PrismaNotificationRepository', () => {
  it('stores every notification in one insert', async () => {
    const notification = { createMany: vi.fn() };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);
    const first = new Notification({
      userId: USER_ID,
      type: 'registration.pending',
      params: { name: 'Ana Souza' },
      createdAt: NOW,
    });
    const second = new Notification({
      userId: USER_ID,
      type: 'registration.approved',
      params: {},
      createdAt: NOW,
    });

    await repository.createMany([first, second]);

    expect(notification.createMany).toHaveBeenCalledWith({
      data: [
        { id: first.id, userId: USER_ID, type: 'registration.pending', params: { name: 'Ana Souza' }, createdAt: NOW },
        { id: second.id, userId: USER_ID, type: 'registration.approved', params: {}, createdAt: NOW },
      ],
    });
  });
});
