import { Logger } from '@nestjs/common';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsEnrolmentNotifier } from './notifications.enrolment-notifier.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ADMIN_ID = '66666666-6666-4666-8666-666666666666';
const INSTRUCTOR_ID = '22222222-2222-4222-8222-222222222222';
const STUDENT_ID = '55555555-5555-4555-8555-555555555555';
const CLASS_ID = '44444444-4444-4444-8444-444444444444';
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');

function setup(adminIds = [ADMIN_ID, OTHER_ADMIN_ID]) {
  const notificationRepository = { createMany: vi.fn().mockResolvedValue(undefined) };
  const pushTokenRepository = { findByUserIds: vi.fn().mockResolvedValue([]), deleteByTokens: vi.fn() };
  const pushTicketRepository = { createMany: vi.fn() };
  const pushProvider = { send: vi.fn().mockResolvedValue([]) };
  const recipientsProvider = { findApprovedAdminIds: vi.fn().mockResolvedValue(adminIds) };
  const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  const notifier = new NotificationsEnrolmentNotifier(
    notificationRepository as unknown as PrismaNotificationRepository,
    pushTokenRepository as unknown as PrismaPushTokenRepository,
    pushTicketRepository as unknown as PrismaPushTicketRepository,
    pushProvider as unknown as ExpoPushProvider,
    recipientsProvider as unknown as PrismaRecipientsProvider,
    new SystemClockProvider(),
  );

  return { notificationRepository, pushTokenRepository, pushProvider, recipientsProvider, error, notifier };
}

const stored = (createMany: { mock: { calls: unknown[][] } }) =>
  (createMany.mock.calls[0]![0] as { userId: string; type: string; params: unknown }[]).map((item) => ({
    userId: item.userId,
    type: item.type,
    params: item.params,
  }));

describe('NotificationsEnrolmentNotifier', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('seatRequested', () => {
    const event = {
      classId: CLASS_ID,
      studentName: 'Ana Souza',
      discipline: 'surf' as const,
      startsAt: STARTS_AT,
      instructorIds: [INSTRUCTOR_ID],
    };
    const params = {
      classId: CLASS_ID,
      studentName: 'Ana Souza',
      discipline: 'surf',
      startsAt: '2026-10-19T11:00:00.000Z',
    };

    it('stores one enrolment.requested per approved admin and per instructor', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.seatRequested(event);

      expect(stored(notificationRepository.createMany)).toEqual([
        { userId: ADMIN_ID, type: 'enrolment.requested', params },
        { userId: OTHER_ADMIN_ID, type: 'enrolment.requested', params },
        { userId: INSTRUCTOR_ID, type: 'enrolment.requested', params },
      ]);
    });

    it('tells an admin who teaches the class once', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.seatRequested({ ...event, instructorIds: [ADMIN_ID, INSTRUCTOR_ID] });

      expect(stored(notificationRepository.createMany).map((item) => item.userId)).toEqual([
        ADMIN_ID,
        OTHER_ADMIN_ID,
        INSTRUCTOR_ID,
      ]);
    });

    it('pushes to the phones of those people', async () => {
      const { pushTokenRepository, pushProvider, notifier } = setup();
      pushTokenRepository.findByUserIds.mockResolvedValue([
        { token: 'ExpoPushToken[a]', userId: INSTRUCTOR_ID, locale: 'pt-BR' },
      ]);

      await notifier.seatRequested(event);

      expect(pushProvider.send.mock.calls[0]![0]).toEqual([
        expect.objectContaining({ token: 'ExpoPushToken[a]', type: 'enrolment.requested', params }),
      ]);
    });

    it('logs and swallows a failure, Error or not', async () => {
      const { notificationRepository, error, notifier } = setup();
      notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

      await expect(notifier.seatRequested(event)).resolves.toBeUndefined();
      await expect(notifier.seatRequested(event)).resolves.toBeUndefined();

      expect(error).toHaveBeenCalledTimes(2);
      expect(error.mock.calls[0]![0]).toContain('enrolment.requested');
      expect(error).toHaveBeenLastCalledWith(expect.stringContaining('enrolment.requested'), 'boom');
    });
  });

  describe('requestExpired', () => {
    const event = { studentId: STUDENT_ID, classId: CLASS_ID, discipline: 'surf' as const, startsAt: STARTS_AT };

    it('stores one enrolment.expired for the student', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.requestExpired(event);

      expect(stored(notificationRepository.createMany)).toEqual([
        {
          userId: STUDENT_ID,
          type: 'enrolment.expired',
          params: { classId: CLASS_ID, discipline: 'surf', startsAt: '2026-10-19T11:00:00.000Z' },
        },
      ]);
    });

    it('logs and swallows a failure, Error or not', async () => {
      const { notificationRepository, error, notifier } = setup();
      notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

      await expect(notifier.requestExpired(event)).resolves.toBeUndefined();
      await expect(notifier.requestExpired(event)).resolves.toBeUndefined();

      expect(error.mock.calls[0]![0]).toContain('enrolment.expired');
      expect(error).toHaveBeenLastCalledWith(expect.stringContaining('enrolment.expired'), 'boom');
    });
  });

  describe('requestApproved', () => {
    const event = { studentId: STUDENT_ID, classId: CLASS_ID, discipline: 'surf' as const, startsAt: STARTS_AT };

    it('stores one enrolment.approved for the student only', async () => {
      const { notificationRepository, recipientsProvider, notifier } = setup();

      await notifier.requestApproved(event);

      expect(stored(notificationRepository.createMany)).toEqual([
        {
          userId: STUDENT_ID,
          type: 'enrolment.approved',
          params: { classId: CLASS_ID, discipline: 'surf', startsAt: '2026-10-19T11:00:00.000Z' },
        },
      ]);
      expect(recipientsProvider.findApprovedAdminIds).not.toHaveBeenCalled();
    });

    it('logs and swallows a failure, Error or not', async () => {
      const { notificationRepository, error, notifier } = setup();
      notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

      await expect(notifier.requestApproved(event)).resolves.toBeUndefined();
      await expect(notifier.requestApproved(event)).resolves.toBeUndefined();

      expect(error.mock.calls[0]![0]).toContain('enrolment.approved');
      expect(error).toHaveBeenLastCalledWith(expect.stringContaining('enrolment.approved'), 'boom');
    });
  });

  describe('requestDenied', () => {
    const event = { studentId: STUDENT_ID, classId: CLASS_ID, discipline: 'surf' as const, startsAt: STARTS_AT };

    it('stores one enrolment.denied with the reason for the student only', async () => {
      const { notificationRepository, recipientsProvider, notifier } = setup();

      await notifier.requestDenied({ ...event, reason: 'Esta aula é de nível avançado.' });

      expect(stored(notificationRepository.createMany)).toEqual([
        {
          userId: STUDENT_ID,
          type: 'enrolment.denied',
          params: {
            classId: CLASS_ID,
            discipline: 'surf',
            startsAt: '2026-10-19T11:00:00.000Z',
            reason: 'Esta aula é de nível avançado.',
          },
        },
      ]);
      expect(recipientsProvider.findApprovedAdminIds).not.toHaveBeenCalled();
    });

    it('leaves the reason out when there is none', async () => {
      const { notificationRepository, notifier } = setup();

      await notifier.requestDenied(event);

      expect(stored(notificationRepository.createMany)[0]!.params).toEqual({
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: '2026-10-19T11:00:00.000Z',
      });
    });

    it('logs and swallows a failure, Error or not', async () => {
      const { notificationRepository, error, notifier } = setup();
      notificationRepository.createMany.mockRejectedValueOnce(new Error('db down')).mockRejectedValueOnce('boom');

      await expect(notifier.requestDenied(event)).resolves.toBeUndefined();
      await expect(notifier.requestDenied(event)).resolves.toBeUndefined();

      expect(error.mock.calls[0]![0]).toContain('enrolment.denied');
      expect(error).toHaveBeenLastCalledWith(expect.stringContaining('enrolment.denied'), 'boom');
    });
  });
});
