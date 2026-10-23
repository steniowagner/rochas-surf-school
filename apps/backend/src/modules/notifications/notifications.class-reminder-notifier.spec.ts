import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsClassReminderNotifier } from './notifications.class-reminder-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const INSTRUCTOR_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_ID = '55555555-5555-4555-8555-555555555555';
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
  const notifier = new NotificationsClassReminderNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    new SystemClockProvider(),
  );
  return { notificationRepository, pushTokenRepository, pushProvider, error, notifier };
}

describe('NotificationsClassReminderNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const event = {
    recipientIds: [STUDENT_ID, INSTRUCTOR_ID],
    classId: CLASS_ID,
    discipline: 'surf' as const,
    startsAt: new Date('2026-10-18T11:00:00.000Z'),
    locationName: 'Praia do Futuro',
  };
  const params = {
    classId: CLASS_ID,
    discipline: 'surf',
    startsAt: '2026-10-18T11:00:00.000Z',
    locationName: 'Praia do Futuro',
  };

  it('stores one class.reminder notification per recipient with the class, start and location name', async () => {
    const { notificationRepository, notifier } = setup();

    await notifier.classReminder(event);

    const stored = notificationRepository.createMany.mock.calls[0]![0].map(
      (notification: { userId: string; type: string; params: unknown }) => ({
        userId: notification.userId,
        type: notification.type,
        params: notification.params,
      }),
    );
    expect(stored).toEqual([
      { userId: STUDENT_ID, type: 'class.reminder', params },
      { userId: INSTRUCTOR_ID, type: 'class.reminder', params },
    ]);
  });

  it('pushes to the phones with the locale each registered, carrying the class id', async () => {
    const { pushTokenRepository, pushProvider, notifier } = setup();
    pushTokenRepository.findByUserIds.mockResolvedValue([
      { token: 'ExpoPushToken[a]', userId: STUDENT_ID, locale: 'es' },
    ]);

    await notifier.classReminder(event);

    expect(pushProvider.send.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ token: 'ExpoPushToken[a]', locale: 'es', type: 'class.reminder', params }),
    ]);
  });

  it('logs and swallows a failure, Error or not', async () => {
    const { notificationRepository, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

    await expect(notifier.classReminder(event)).resolves.toBeUndefined();
    await expect(notifier.classReminder(event)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(2);
    expect(error.mock.calls[0]![0]).toBe('Could not notify class.reminder to 2 person(s)');
    expect(error).toHaveBeenLastCalledWith(expect.stringContaining('class.reminder'), 'boom');
  });
});
