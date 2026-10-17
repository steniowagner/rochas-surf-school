import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsClassChangeNotifier } from './notifications.class-change-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const INSTRUCTOR_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
const CLASS_ID = '44444444-4444-4444-8444-444444444444';

function setup() {
  const notificationRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRepository = {
    findByUserIds: vi.fn().mockResolvedValue([]),
    deleteByTokens: vi.fn(),
  };
  const pushTicketRepository = { createMany: vi.fn() };
  const pushProvider = { send: vi.fn().mockResolvedValue([]) };
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const notifier = new NotificationsClassChangeNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    new SystemClockProvider(),
  );
  return { notificationRepository, pushTokenRepository, pushProvider, error, notifier };
}

describe('NotificationsClassChangeNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const startsAt = new Date('2026-10-18T11:00:00.000Z');
  const event = { instructorIds: [INSTRUCTOR_ID, OTHER_ID], classId: CLASS_ID, discipline: 'surf' as const, startsAt };

  it('stores one class.edited notification per instructor with the class id, discipline and start', async () => {
    const { notificationRepository, notifier } = setup();

    await notifier.classEdited(event);

    const stored = notificationRepository.createMany.mock.calls[0]![0].map(
      (notification: { userId: string; type: string; params: unknown }) => ({
        userId: notification.userId,
        type: notification.type,
        params: notification.params,
      }),
    );
    const params = { classId: CLASS_ID, discipline: 'surf', startsAt: '2026-10-18T11:00:00.000Z' };
    expect(stored).toEqual([
      { userId: INSTRUCTOR_ID, type: 'class.edited', params },
      { userId: OTHER_ID, type: 'class.edited', params },
    ]);
  });

  it('pushes to the phones of the instructor with the locale each registered', async () => {
    const { pushTokenRepository, pushProvider, notifier } = setup();
    pushTokenRepository.findByUserIds.mockResolvedValue([
      { token: 'ExpoPushToken[a]', userId: INSTRUCTOR_ID, locale: 'pt-BR' },
    ]);

    await notifier.classEdited({ ...event, instructorIds: [INSTRUCTOR_ID] });

    expect(pushProvider.send.mock.calls[0]![0]).toEqual([
      expect.objectContaining({
        token: 'ExpoPushToken[a]',
        locale: 'pt-BR',
        type: 'class.edited',
        params: { classId: CLASS_ID, discipline: 'surf', startsAt: '2026-10-18T11:00:00.000Z' },
      }),
    ]);
  });

  it('logs and swallows a failure', async () => {
    const { notificationRepository, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValue(new Error('db down'));

    await expect(notifier.classEdited(event)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]![0]).toContain('class.edited');
  });

  it('logs a thrown value that is not an Error', async () => {
    const { notificationRepository, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValue('boom');

    await notifier.classEdited(event);

    expect(error).toHaveBeenCalledWith(expect.stringContaining('class.edited'), 'boom');
  });
});
