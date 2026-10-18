import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsNoInstructorNotifier } from './notifications.no-instructor-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const ADMIN_A = '11111111-1111-4111-8111-111111111111';
const ADMIN_B = '22222222-2222-4222-8222-222222222222';
const LEAVING = '33333333-3333-4333-8333-333333333333';
const CLASS_ID = '9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47';
const STARTS_AT = new Date('2026-10-18T11:00:00.000Z');

const EVENT = {
  count: 2,
  classId: CLASS_ID,
  discipline: 'surf' as const,
  startsAt: STARTS_AT,
  excludeUserIds: [LEAVING],
};

function setup() {
  const notificationRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRepository = {
    findByUserIds: vi.fn().mockResolvedValue([]),
    deleteByTokens: vi.fn(),
  };
  const pushTicketRepository = { createMany: vi.fn() };
  const pushProvider = { send: vi.fn().mockResolvedValue([]) };
  const recipientsProvider = {
    findApprovedAdminIds: vi.fn().mockResolvedValue([ADMIN_A, LEAVING, ADMIN_B]),
  };
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const notifier = new NotificationsNoInstructorNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    recipientsProvider as unknown as PrismaRecipientsProvider,
    new SystemClockProvider(),
  );
  return { notificationRepository, pushProvider, recipientsProvider, error, notifier };
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

describe('NotificationsNoInstructorNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tells every approved admin except the excluded ones, with the count and the earliest class', async () => {
    const { notificationRepository, notifier } = setup();

    await notifier.classesWithoutInstructor(EVENT);

    const params = { count: 2, classId: CLASS_ID, discipline: 'surf', startsAt: '2026-10-18T11:00:00.000Z' };
    expect(storedOf(notificationRepository)).toEqual([
      { userId: ADMIN_A, type: 'class.noInstructor', params },
      { userId: ADMIN_B, type: 'class.noInstructor', params },
    ]);
  });

  it('logs and swallows a store failure', async () => {
    const { notificationRepository, pushProvider, error, notifier } = setup();
    notificationRepository.createMany.mockRejectedValue(new Error('db down'));

    await expect(notifier.classesWithoutInstructor(EVENT)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]![0]).toContain(`class.noInstructor for ${CLASS_ID}`);
    expect(pushProvider.send).not.toHaveBeenCalled();
  });

  it('logs a thrown value that is not an Error', async () => {
    const { recipientsProvider, error, notifier } = setup();
    recipientsProvider.findApprovedAdminIds.mockRejectedValue('boom');

    await expect(notifier.classesWithoutInstructor(EVENT)).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledWith(expect.stringContaining('class.noInstructor'), 'boom');
  });
});
