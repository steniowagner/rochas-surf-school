import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsAccountRemovalNotifier } from './notifications.account-removal-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const USER_ID = '22222222-2222-4222-8222-222222222222';

function setup() {
  const notificationRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRepository = {
    findByUserIds: vi.fn().mockResolvedValue([{ token: 'ExpoPushToken[a]', userId: USER_ID, locale: 'pt-BR' }]),
    deleteByTokens: vi.fn(),
  };
  const pushTicketRepository = { createMany: vi.fn() };
  const pushProvider = { send: vi.fn().mockResolvedValue([]) };
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const notifier = new NotificationsAccountRemovalNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    new SystemClockProvider(),
  );
  return { notificationRepository, pushProvider, error, notifier };
}

describe('NotificationsAccountRemovalNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['accountRemoved', 'account.removed'],
    ['accountRestored', 'account.restored'],
  ] as const)('%s stores and pushes one %s to the person, with no params', async (method, type) => {
    const { notificationRepository, pushProvider, error, notifier } = setup();

    await notifier[method](USER_ID);

    const [stored] = notificationRepository.createMany.mock.calls[0]!;
    expect(
      stored.map((item: { userId: string; type: string; params: unknown }) => ({
        userId: item.userId,
        type: item.type,
        params: item.params,
      })),
    ).toEqual([{ userId: USER_ID, type, params: {} }]);
    expect(pushProvider.send.mock.calls[0]![0]).toEqual([
      expect.objectContaining({ token: 'ExpoPushToken[a]', locale: 'pt-BR', type, params: {} }),
    ]);
    expect(error).not.toHaveBeenCalled();
  });

  it('logs and swallows a store failure, pushing nothing', async () => {
    const { notificationRepository, pushProvider, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValue(new Error('db down'));

    await expect(notifier.accountRemoved(USER_ID)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(`account.removed for ${USER_ID}`),
      expect.stringContaining('db down'),
    );
    expect(pushProvider.send).not.toHaveBeenCalled();
  });

  it('logs and swallows a push failure, keeping what was stored, and a thrown value that is not an Error', async () => {
    const failing = setup();
    failing.pushProvider.send.mockRejectedValue(new Error('expo down'));
    await expect(failing.notifier.accountRestored(USER_ID)).resolves.toBeUndefined();
    expect(failing.notificationRepository.createMany).toHaveBeenCalledTimes(1);
    expect(failing.error).toHaveBeenCalledTimes(1);

    const throwing = setup();
    throwing.notificationRepository.createMany.mockRejectedValue('boom');
    await expect(throwing.notifier.accountRestored(USER_ID)).resolves.toBeUndefined();
    expect(throwing.error).toHaveBeenCalledWith(expect.stringContaining('account.restored'), 'boom');
  });
});
