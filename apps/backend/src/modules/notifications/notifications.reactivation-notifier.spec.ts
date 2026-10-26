import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsReactivationNotifier } from './notifications.reactivation-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

function setup() {
  const notificationRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRepository = {
    findByUserIds: vi.fn().mockResolvedValue([]),
    deleteByTokens: vi.fn(),
  };
  const pushTicketRepository = { createMany: vi.fn() };
  const pushProvider = { send: vi.fn().mockResolvedValue([]) };
  const recipientsProvider = { findApprovedAdminIds: vi.fn().mockResolvedValue([ADMIN_ID]) };
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const notifier = new NotificationsReactivationNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    recipientsProvider as unknown as PrismaRecipientsProvider,
    new SystemClockProvider(),
  );
  return { notificationRepository, pushTokenRepository, pushProvider, recipientsProvider, error, notifier };
}

function storedOf(repository: { createMany: ReturnType<typeof vi.fn> }) {
  return repository.createMany.mock.calls[0]![0].map(
    (notification: { userId: string; type: string; params: unknown }) => ({
      userId: notification.userId,
      type: notification.type,
      params: notification.params,
    }),
  );
}

describe('NotificationsReactivationNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tells every approved admin about a reactivation request', async () => {
    const { notificationRepository, notifier } = setup();

    await notifier.reactivationRequested({ id: USER_ID, name: 'Ana Souza' });

    expect(storedOf(notificationRepository)).toEqual([
      { userId: ADMIN_ID, type: 'reactivation.requested', params: { name: 'Ana Souza', userId: USER_ID } },
    ]);
  });

  it('tells the person their account was reactivated', async () => {
    const { notificationRepository, notifier } = setup();

    await notifier.reactivationApproved(USER_ID);

    expect(storedOf(notificationRepository)).toEqual([
      { userId: USER_ID, type: 'reactivation.approved', params: {} },
    ]);
  });

  it('tells the person it was denied, with the reason when there is one', async () => {
    const withReason = setup();
    await withReason.notifier.reactivationDenied(USER_ID, 'Não conhecemos você.');
    expect(storedOf(withReason.notificationRepository)).toEqual([
      { userId: USER_ID, type: 'reactivation.denied', params: { reason: 'Não conhecemos você.' } },
    ]);

    const withoutReason = setup();
    await withoutReason.notifier.reactivationDenied(USER_ID);
    expect(storedOf(withoutReason.notificationRepository)).toEqual([
      { userId: USER_ID, type: 'reactivation.denied', params: {} },
    ]);
  });

  it('logs and swallows a store failure', async () => {
    const { notificationRepository, pushProvider, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValue(new Error('db down'));

    await expect(notifier.reactivationApproved(USER_ID)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]![0]).toContain(`reactivation.approved for ${USER_ID}`);
    expect(pushProvider.send).not.toHaveBeenCalled();
  });

  it('logs and swallows a push failure, keeping what was stored', async () => {
    const { notificationRepository, pushTokenRepository, pushProvider, error, notifier } = setup();
    pushTokenRepository.findByUserIds.mockResolvedValue([
      { token: 'ExpoPushToken[a]', userId: USER_ID, locale: 'en' },
    ]);
    pushProvider.send.mockRejectedValue(new Error('expo down'));

    await expect(notifier.reactivationDenied(USER_ID, 'x')).resolves.toBeUndefined();

    expect(notificationRepository.createMany).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('logs a thrown value that is not an Error', async () => {
    const { recipientsProvider, error, notifier } = setup();
    recipientsProvider.findApprovedAdminIds.mockRejectedValue('boom');

    await expect(notifier.reactivationRequested({ id: USER_ID, name: 'Ana' })).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('reactivation.requested'), 'boom');
  });
});
