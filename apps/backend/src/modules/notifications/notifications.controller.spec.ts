import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { Notification } from '@rochas-surf-school/notifications';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsController } from './notifications.controller.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-12T12:00:00.000Z');

function userOf(status: AuthenticatedUser['status']): AuthenticatedUser {
  return {
    id: '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e',
    email: 'ana@example.com',
    role: 'student',
    status,
  } as AuthenticatedUser;
}

function handlerOf(name: keyof NotificationsController): object {
  return Object.getOwnPropertyDescriptor(NotificationsController.prototype, name)!.value as object;
}

function setup() {
  const repository = { upsert: vi.fn(), deleteForUser: vi.fn() };
  const notifications = {
    findPage: vi.fn(),
    countUnread: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  };
  const controller = new NotificationsController(
    repository as unknown as PrismaPushTokenRepository,
    { now: () => NOW } as SystemClockProvider,
    notifications as unknown as PrismaNotificationRepository,
  );
  return { controller, repository, notifications };
}

describe('NotificationsController', () => {
  it('registerPushToken is a protected PUT on push-token answering 204', () => {
    const handler = Object.getOwnPropertyDescriptor(
      NotificationsController.prototype,
      'registerPushToken',
    )!.value as object;

    expect(Reflect.getMetadata(PATH_METADATA, NotificationsController)).toBe('notifications');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('push-token');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PUT);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.NO_CONTENT);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('stores the token of the caller with the body locale', async () => {
    const { controller, repository } = setup();

    await expect(
      controller.registerPushToken(userOf('approved'), {
        token: 'ExponentPushToken[abc]',
        locale: 'es',
      }),
    ).resolves.toBeUndefined();

    const stored = repository.upsert.mock.calls[0]![0];
    expect(stored).toMatchObject({
      token: 'ExponentPushToken[abc]',
      userId: userOf('approved').id,
      locale: 'es',
    });
    expect(stored.updatedAt).toEqual(NOW);
  });

  it('refuses a closed account before looking at the body', async () => {
    const { controller, repository } = setup();

    await expect(controller.registerPushToken(userOf('denied'), undefined)).rejects.toMatchObject({
      statusCode: 403,
      message: 'pushToken.status.notAllowed',
    });
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('answers 422 with both keys when there is no body', async () => {
    const { controller } = setup();

    await expect(controller.registerPushToken(userOf('pending'), undefined)).rejects.toMatchObject({
      statusCode: 422,
      errors: [
        expect.objectContaining({ message: 'pushToken.token.invalid' }),
        expect.objectContaining({ message: 'pushToken.locale.invalid' }),
      ],
    });
  });

  describe('DELETE push-token', () => {
    it('is a protected DELETE on push-token answering 204', () => {
      const handler = Object.getOwnPropertyDescriptor(
        NotificationsController.prototype,
        'unregisterPushToken',
      )!.value as object;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('push-token');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.DELETE);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.NO_CONTENT);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('removes the token of the caller', async () => {
      const { controller, repository } = setup();

      await expect(
        controller.unregisterPushToken(userOf('approved').id, { token: 'ExponentPushToken[abc]' }),
      ).resolves.toBeUndefined();

      expect(repository.deleteForUser).toHaveBeenCalledWith(
        userOf('approved').id,
        'ExponentPushToken[abc]',
      );
    });

    it('answers 422 when there is no body', async () => {
      const { controller, repository } = setup();

      await expect(controller.unregisterPushToken(userOf('approved').id, undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'pushToken.token.required' })],
      });
      expect(repository.deleteForUser).not.toHaveBeenCalled();
    });
  });

  describe('GET notifications', () => {
    const USER_ID = userOf('approved').id;
    const CLASS_ID = '9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47';

    it('is a protected GET on the controller root answering 200', () => {
      const handler = handlerOf('list');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('answers the page with each item written in the requested language, its class id and read state', async () => {
      const { controller, notifications } = setup();
      const edited = new Notification({
        userId: USER_ID,
        type: 'class.edited',
        params: { classId: CLASS_ID, discipline: 'surf', startsAt: '2026-10-20T11:00:00.000Z' },
        createdAt: NOW,
        readAt: NOW,
      });
      const deleted = new Notification({
        userId: USER_ID,
        type: 'class.deleted',
        params: { discipline: 'surf', startsAt: '2026-10-20T11:00:00.000Z' },
        createdAt: NOW,
      });
      notifications.findPage.mockResolvedValue({ items: [edited, deleted], total: 22 });

      const result = await controller.list(USER_ID, '2', '2', 'en');

      expect(notifications.findPage).toHaveBeenCalledWith(USER_ID, 2, 2);
      expect(result).toEqual({
        items: [
          {
            id: edited.id,
            type: 'class.edited',
            classId: CLASS_ID,
            title: 'Class changed',
            body: 'Your Surf class on 10/20 at 08:00 was changed.',
            createdAt: NOW.toISOString(),
            read: true,
          },
          {
            id: deleted.id,
            type: 'class.deleted',
            classId: null,
            title: 'Class deleted',
            body: 'Your Surf class on 10/20 at 08:00 was deleted.',
            createdAt: NOW.toISOString(),
            read: false,
          },
        ],
        page: 2,
        perPage: 2,
        total: 22,
      });
    });

    it('writes pt-BR without a locale', async () => {
      const { controller, notifications } = setup();
      notifications.findPage.mockResolvedValue({
        items: [new Notification({ userId: USER_ID, type: 'registration.approved', params: { classId: 7 } })],
        total: 1,
      });

      const result = await controller.list(USER_ID);

      expect(notifications.findPage).toHaveBeenCalledWith(USER_ID, 1, 20);
      expect(result.items[0]).toMatchObject({ title: 'Conta aprovada', classId: null });
    });

    it('answers 422 with every invalid query key', async () => {
      const { controller, notifications } = setup();

      await expect(controller.list(USER_ID, '0', '51', 'fr')).rejects.toMatchObject({
        statusCode: 422,
        errors: [
          expect.objectContaining({ message: 'notifications.page.invalid' }),
          expect.objectContaining({ message: 'notifications.perPage.invalid' }),
          expect.objectContaining({ message: 'notifications.locale.invalid' }),
        ],
      });
      expect(notifications.findPage).not.toHaveBeenCalled();
    });
  });

  describe('GET notifications/unread-count', () => {
    it('is a protected GET on unread-count answering 200', () => {
      const handler = handlerOf('countUnread');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('unread-count');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('answers the caller\'s unread count', async () => {
      const { controller, notifications } = setup();
      notifications.countUnread.mockResolvedValue(3);

      await expect(controller.countUnread(userOf('approved').id)).resolves.toEqual({ count: 3 });
      expect(notifications.countUnread).toHaveBeenCalledWith(userOf('approved').id);
    });
  });

  describe('POST notifications/read-all', () => {
    it('is a protected POST on read-all answering 204', () => {
      const handler = handlerOf('markAllRead');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('read-all');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.NO_CONTENT);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('marks every notification of the caller read at the clock\'s now', async () => {
      const { controller, notifications } = setup();

      await expect(controller.markAllRead(userOf('approved').id)).resolves.toBeUndefined();
      expect(notifications.markAllRead).toHaveBeenCalledWith(userOf('approved').id, NOW);
    });
  });

  describe('POST notifications/:id/read', () => {
    const ID = '6f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';

    it('is a protected POST on :id/read answering 204', () => {
      const handler = handlerOf('markRead');

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/read');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.NO_CONTENT);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('marks the caller\'s notification read at the clock\'s now', async () => {
      const { controller, notifications } = setup();
      notifications.markRead.mockResolvedValue(true);

      await expect(controller.markRead(userOf('approved').id, ID)).resolves.toBeUndefined();
      expect(notifications.markRead).toHaveBeenCalledWith(userOf('approved').id, ID, NOW);
    });

    it('answers 404 notification.notFound for a notification the caller doesn\'t have', async () => {
      const { controller, notifications } = setup();
      notifications.markRead.mockResolvedValue(false);

      await expect(controller.markRead(userOf('approved').id, ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'notification.notFound',
      });
    });
  });
});
