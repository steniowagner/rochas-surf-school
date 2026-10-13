import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
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

function setup() {
  const repository = { upsert: vi.fn() };
  const controller = new NotificationsController(
    repository as unknown as PrismaPushTokenRepository,
    { now: () => NOW } as SystemClockProvider,
  );
  return { controller, repository };
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
});
