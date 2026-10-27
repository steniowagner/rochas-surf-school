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

  it('deletes the registration.pending notifications whose params.userId is one of the ids', async () => {
    const notification = { deleteMany: vi.fn() };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    await repository.deleteRegistrationPending([USER_ID, 'other-id']);

    expect(notification.deleteMany).toHaveBeenCalledWith({
      where: {
        type: 'registration.pending',
        OR: [
          { params: { path: ['userId'], equals: USER_ID } },
          { params: { path: ['userId'], equals: 'other-id' } },
        ],
      },
    });
  });

  it('deletes nothing for an empty list', async () => {
    const notification = { deleteMany: vi.fn() };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    await repository.deleteRegistrationPending([]);

    expect(notification.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes the notifications about the people, by userId and by studentId', async () => {
    const notification = { deleteMany: vi.fn() };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    await repository.deleteAbout([USER_ID, 'other-id']);

    expect(notification.deleteMany).toHaveBeenCalledTimes(2);
    expect(notification.deleteMany).toHaveBeenNthCalledWith(1, {
      where: {
        type: { in: ['registration.pending', 'reactivation.requested'] },
        OR: [
          { params: { path: ['userId'], equals: USER_ID } },
          { params: { path: ['userId'], equals: 'other-id' } },
        ],
      },
    });
    expect(notification.deleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        type: { in: ['enrolment.requested', 'enrolment.cancelled'] },
        OR: [
          { params: { path: ['studentId'], equals: USER_ID } },
          { params: { path: ['studentId'], equals: 'other-id' } },
        ],
      },
    });
  });

  it('deletes nothing about nobody', async () => {
    const notification = { deleteMany: vi.fn() };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    await repository.deleteAbout([]);

    expect(notification.deleteMany).not.toHaveBeenCalled();
  });

  it('pages the user\'s notifications newest first, by id on a tie, mapped to the domain, with the total', async () => {
    const OTHER_ID = '6f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
    const READ_AT = new Date('2026-10-13T08:00:00.000Z');
    const notification = {
      findMany: vi.fn().mockResolvedValue([
        { id: OTHER_ID, userId: USER_ID, type: 'class.deleted', params: { discipline: 'surf' }, createdAt: NOW, readAt: READ_AT },
        { id: '9a8b7c6d-5e4f-4a3b-9c2d-1e0f9a8b7c6d', userId: USER_ID, type: 'registration.approved', params: {}, createdAt: NOW, readAt: null },
      ]),
      count: vi.fn().mockResolvedValue(25),
    };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    const result = await repository.findPage(USER_ID, 2, 20);

    expect(notification.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 20,
      take: 20,
    });
    expect(notification.count).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    expect(result.total).toBe(25);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toBeInstanceOf(Notification);
    expect(result.items[0].id).toBe(OTHER_ID);
    expect(result.items[0].type).toBe('class.deleted');
    expect(result.items[0].params).toEqual({ discipline: 'surf' });
    expect(result.items[0].createdAt).toEqual(NOW);
    expect(result.items[0].readAt).toEqual(READ_AT);
    expect(result.items[1].readAt).toBeNull();
  });

  it('counts the user\'s unread notifications', async () => {
    const notification = { count: vi.fn().mockResolvedValue(3) };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    expect(await repository.countUnread(USER_ID)).toBe(3);
    expect(notification.count).toHaveBeenCalledWith({ where: { userId: USER_ID, readAt: null } });
  });

  describe('markRead', () => {
    const ID = '6f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';

    it('sets readAt only on the user\'s unread notification and answers found', async () => {
      const notification = { updateMany: vi.fn().mockResolvedValue({ count: 1 }), count: vi.fn() };
      const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

      expect(await repository.markRead(USER_ID, ID, NOW)).toBe(true);
      expect(notification.updateMany).toHaveBeenCalledWith({
        where: { id: ID, userId: USER_ID, readAt: null },
        data: { readAt: NOW },
      });
      expect(notification.count).not.toHaveBeenCalled();
    });

    it('answers found for the user\'s notification that was already read', async () => {
      const notification = {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(1),
      };
      const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

      expect(await repository.markRead(USER_ID, ID, NOW)).toBe(true);
      expect(notification.count).toHaveBeenCalledWith({ where: { id: ID, userId: USER_ID } });
    });

    it('answers not found when the user has no notification with that id', async () => {
      const notification = {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        count: vi.fn().mockResolvedValue(0),
      };
      const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

      expect(await repository.markRead(USER_ID, ID, NOW)).toBe(false);
    });
  });

  it('sets readAt on every unread notification of the user', async () => {
    const notification = { updateMany: vi.fn().mockResolvedValue({ count: 2 }) };
    const repository = new PrismaNotificationRepository({ notification } as unknown as PrismaService);

    await repository.markAllRead(USER_ID, NOW);

    expect(notification.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, readAt: null },
      data: { readAt: NOW },
    });
  });
});
