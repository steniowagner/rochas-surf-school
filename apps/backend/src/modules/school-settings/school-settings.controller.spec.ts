import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import {
  ForbiddenError,
  ValidationException,
} from '@rochas-surf-school/shared';
import { SchoolSettings } from '@rochas-surf-school/school-settings';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { SchoolSettingsController } from './school-settings.controller.js';
import { PrismaSchoolSettingsRepository } from './school-settings.prisma.js';

function userOf(role: string, status: string): AuthenticatedUser {
  return {
    id: '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34',
    email: `${role}@example.com`,
    role,
    status,
    claims: {},
  } as unknown as AuthenticatedUser;
}

const ADMIN = userOf('admin', 'approved');

function handlerOf(name: keyof SchoolSettingsController): object {
  return Object.getOwnPropertyDescriptor(
    SchoolSettingsController.prototype,
    name,
  )!.value as object;
}

function setup(initial: SchoolSettings | null = null) {
  let stored = initial;
  const repository = {
    get: vi.fn(async () => stored),
    save: vi.fn(async (settings: SchoolSettings) => {
      stored = settings;
    }),
  };
  const controller = new SchoolSettingsController(
    repository as unknown as PrismaSchoolSettingsRepository,
  );
  return { controller, repository };
}

describe('SchoolSettingsController', () => {
  it.each([
    ['get', '/', RequestMethod.GET],
    ['setWhatsapp', 'whatsapp', RequestMethod.PUT],
  ] as const)(
    '%s is a protected %s route answering 200',
    (name, path, method) => {
      const handler = handlerOf(name);

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(
        HttpStatus.OK,
      );
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    },
  );

  it('answers no number while none was set', async () => {
    const { controller } = setup();

    await expect(controller.get(userOf('student', 'denied'))).resolves.toEqual({
      whatsappNumber: null,
    });
  });

  it('sets the number for an approved admin and reads it back', async () => {
    const { controller, repository } = setup();

    await expect(
      controller.setWhatsapp(ADMIN, { whatsappNumber: '+5585999998888' }),
    ).resolves.toEqual({ whatsappNumber: '+5585999998888' });

    expect(repository.save).toHaveBeenCalledTimes(1);
    await expect(
      controller.get(userOf('instructor', 'removed')),
    ).resolves.toEqual({
      whatsappNumber: '+5585999998888',
    });
  });

  it('answers 422 required without a body', async () => {
    const { controller, repository } = setup();

    const error = (await controller
      .setWhatsapp(ADMIN, undefined)
      .catch((e) => e)) as ValidationException;

    expect(error).toBeInstanceOf(ValidationException);
    expect(error.errors.map((item) => item.message)).toEqual([
      'schoolSettings.whatsappNumber.required',
    ]);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('passes the actor so a student is refused', async () => {
    const { controller } = setup();

    const error = await controller
      .setWhatsapp(userOf('student', 'approved'), {
        whatsappNumber: '+5585999998888',
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ForbiddenError);
    expect((error as ForbiddenError).message).toBe(
      'schoolSettings.role.notAdmin',
    );
  });
});
