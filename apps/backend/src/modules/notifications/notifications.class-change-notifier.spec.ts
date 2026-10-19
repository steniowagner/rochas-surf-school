import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsClassChangeNotifier } from './notifications.class-change-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const INSTRUCTOR_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_ID = '33333333-3333-4333-8333-333333333333';
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

  describe('classCancelled', () => {
    const storedParams = (createMany: { mock: { calls: unknown[][] } }) =>
      (createMany.mock.calls[0]![0] as { userId: string; type: string; params: unknown }[]).map((notification) => ({
        userId: notification.userId,
        type: notification.type,
        params: notification.params,
      }));

    it('stores one class.cancelled notification per instructor with the message', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.classCancelled({ ...event, message: 'Mar muito grande.' });

      const params = {
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: '2026-10-18T11:00:00.000Z',
        message: 'Mar muito grande.',
      };
      expect(storedParams(notificationRepository.createMany)).toEqual([
        { userId: INSTRUCTOR_ID, type: 'class.cancelled', params },
        { userId: OTHER_ID, type: 'class.cancelled', params },
      ]);
    });

    it('tells the students whose enrolment ended too, each person once', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.classCancelled({ ...event, studentIds: [STUDENT_ID, INSTRUCTOR_ID] });

      expect(storedParams(notificationRepository.createMany).map((item) => [item.userId, item.type])).toEqual([
        [INSTRUCTOR_ID, 'class.cancelled'],
        [OTHER_ID, 'class.cancelled'],
        [STUDENT_ID, 'class.cancelled'],
      ]);
    });

    it('tells students when there is no instructor to tell', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.classCancelled({ ...event, instructorIds: [], studentIds: [STUDENT_ID] });

      expect(storedParams(notificationRepository.createMany).map((item) => item.userId)).toEqual([STUDENT_ID]);
    });

    it('leaves the message out of the details when there is none', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.classCancelled(event);

      expect(storedParams(notificationRepository.createMany)[0]!.params).toEqual({
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: '2026-10-18T11:00:00.000Z',
      });
    });

    it('pushes the cancellation to the instructor in the locale the phone registered', async () => {
      const { pushTokenRepository, pushProvider, notifier } = setup();
      pushTokenRepository.findByUserIds.mockResolvedValue([
        { token: 'ExpoPushToken[a]', userId: INSTRUCTOR_ID, locale: 'es' },
      ]);

      await notifier.classCancelled({ ...event, instructorIds: [INSTRUCTOR_ID], message: 'Mar grande' });

      expect(pushProvider.send.mock.calls[0]![0]).toEqual([
        expect.objectContaining({ token: 'ExpoPushToken[a]', locale: 'es', type: 'class.cancelled' }),
      ]);
    });

    it('logs and swallows a failure, Error or not', async () => {
      const { notificationRepository, error, notifier } = setup();
      notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

      await expect(notifier.classCancelled(event)).resolves.toBeUndefined();
      await expect(notifier.classCancelled(event)).resolves.toBeUndefined();

      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls[0]![0]).toContain('class.cancelled');
      expect(error).toHaveBeenLastCalledWith(expect.stringContaining('class.cancelled'), 'boom');
    });
  });

  describe('classDeleted', () => {
    const deleted = { instructorIds: event.instructorIds, discipline: event.discipline, startsAt: event.startsAt };

    it('stores one class.deleted notification per instructor, without a class id', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.classDeleted(deleted);

      const params = { discipline: 'surf', startsAt: '2026-10-18T11:00:00.000Z' };
      const stored = (notificationRepository.createMany.mock.calls[0]![0] as { userId: string; type: string; params: unknown }[]).map(
        (notification) => ({ userId: notification.userId, type: notification.type, params: notification.params }),
      );
      expect(stored).toEqual([
        { userId: INSTRUCTOR_ID, type: 'class.deleted', params },
        { userId: OTHER_ID, type: 'class.deleted', params },
      ]);
    });

    it('pushes the deletion to the instructor in the locale the phone registered', async () => {
      const { pushTokenRepository, pushProvider, notifier } = setup();
      pushTokenRepository.findByUserIds.mockResolvedValue([
        { token: 'ExpoPushToken[a]', userId: INSTRUCTOR_ID, locale: 'en' },
      ]);

      await notifier.classDeleted({ ...deleted, instructorIds: [INSTRUCTOR_ID] });

      expect(pushProvider.send.mock.calls[0]![0]).toEqual([
        expect.objectContaining({ token: 'ExpoPushToken[a]', locale: 'en', type: 'class.deleted' }),
      ]);
    });

    it('logs and swallows a failure, Error or not', async () => {
      const { notificationRepository, error, notifier } = setup();
      notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

      await expect(notifier.classDeleted(deleted)).resolves.toBeUndefined();
      await expect(notifier.classDeleted(deleted)).resolves.toBeUndefined();

      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls[0]![0]).toContain('class.deleted');
      expect(error).toHaveBeenLastCalledWith(expect.stringContaining('class.deleted'), 'boom');
    });
  });
});
