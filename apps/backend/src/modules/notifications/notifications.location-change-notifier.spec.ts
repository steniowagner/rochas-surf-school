import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsLocationChangeNotifier } from './notifications.location-change-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const INSTRUCTOR_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';

function setup() {
  const notificationRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRepository = {
    findByUserIds: vi.fn().mockResolvedValue([]),
    deleteByTokens: vi.fn(),
  };
  const pushTicketRepository = { createMany: vi.fn() };
  const pushProvider = { send: vi.fn().mockResolvedValue([]) };
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const notifier = new NotificationsLocationChangeNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    new SystemClockProvider(),
  );
  return { notificationRepository, pushTokenRepository, pushProvider, error, notifier };
}

const event = {
  recipients: [
    { userId: INSTRUCTOR_ID, count: 2 },
    { userId: OTHER_ID, count: 1 },
  ],
  locationName: 'Praia do Futuro',
};

describe('NotificationsLocationChangeNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores one location.changed notification per instructor with their count and the new name', async () => {
    const { notificationRepository, notifier } = setup();

    await notifier.locationChanged(event);

    const stored = notificationRepository.createMany.mock.calls.flatMap(
      (call) => call[0] as { userId: string; type: string; params: unknown }[],
    );
    expect(stored.map(({ userId, type, params }) => ({ userId, type, params }))).toEqual([
      {
        userId: INSTRUCTOR_ID,
        type: 'location.changed',
        params: { count: 2, locationName: 'Praia do Futuro' },
      },
      {
        userId: OTHER_ID,
        type: 'location.changed',
        params: { count: 1, locationName: 'Praia do Futuro' },
      },
    ]);
  });

  it('pushes to the phone of the instructor in the locale it registered, without a class id', async () => {
    const { pushTokenRepository, pushProvider, notifier } = setup();
    pushTokenRepository.findByUserIds.mockResolvedValue([
      { token: 'ExpoPushToken[a]', userId: INSTRUCTOR_ID, locale: 'es' },
    ]);

    await notifier.locationChanged({ ...event, recipients: [event.recipients[0]] });

    expect(pushProvider.send.mock.calls[0]![0]).toEqual([
      expect.objectContaining({
        token: 'ExpoPushToken[a]',
        locale: 'es',
        type: 'location.changed',
        params: { count: 2, locationName: 'Praia do Futuro' },
      }),
    ]);
    expect(pushProvider.send.mock.calls[0]![0][0].params).not.toHaveProperty('classId');
  });

  it('logs and swallows a failure, still notifying the next instructor', async () => {
    const { notificationRepository, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValueOnce(new Error('db down'));

    await expect(notifier.locationChanged(event)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]![0]).toContain('location.changed');
    expect(notificationRepository.createMany).toHaveBeenCalledTimes(2);
  });

  it('logs a thrown value that is not an Error', async () => {
    const { notificationRepository, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValue('boom');

    await notifier.locationChanged({ ...event, recipients: [event.recipients[0]] });

    expect(error).toHaveBeenCalledWith(expect.stringContaining('location.changed'), 'boom');
  });
});
