import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { User } from '@rochas-surf-school/auth';
import { ForbiddenError } from '@rochas-surf-school/shared';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsRegistrationNotifier } from '../notifications/notifications.registration-notifier.js';
import { RegistrationsController } from './registrations.controller.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

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
const NOW = new Date('2026-10-12T15:00:00.000Z');

function handlerOf(name: keyof RegistrationsController): object {
  return Object.getOwnPropertyDescriptor(
    RegistrationsController.prototype,
    name,
  )!.value as object;
}

function pendingUser(): User {
  return new User({
    name: 'Ana Souza',
    email: 'ana@example.com',
    whatsappVisible: false,
    role: 'student',
    status: 'pending',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
  });
}

function setup(pending: User[] = [pendingUser()]) {
  const repository = {
    findPending: vi.fn(async () => pending),
    findById: vi.fn(async (id: string) => pending.find((u) => u.id === id)),
    updateIfPending: vi.fn(async () => true),
  };
  const clock = { now: () => NOW } as unknown as SystemClockProvider;
  const registrationNotifier = {
    registrationApproved: vi.fn().mockResolvedValue(undefined),
    registrationDenied: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new RegistrationsController(
    repository as unknown as PrismaUserRepository,
    clock,
    registrationNotifier as unknown as NotificationsRegistrationNotifier,
  );
  return { controller, repository, pending, registrationNotifier };
}

describe('RegistrationsController', () => {
  it.each([
    ['list', '/', RequestMethod.GET],
    ['approve', ':id/approve', RequestMethod.POST],
    ['deny', ':id/deny', RequestMethod.POST],
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

  it('lists the pending registrations for an admin', async () => {
    const { controller, pending } = setup();

    await expect(controller.list(ADMIN)).resolves.toEqual({
      items: [
        {
          id: pending[0].id,
          name: 'Ana Souza',
          email: 'ana@example.com',
          createdAt: '2026-10-01T10:00:00.000Z',
        },
      ],
    });
  });

  it('refuses a student', async () => {
    const { controller } = setup();

    await expect(
      controller.list(userOf('student', 'approved')),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('approves a registration', async () => {
    const { controller, pending, registrationNotifier } = setup();

    await expect(controller.approve(ADMIN, pending[0].id)).resolves.toEqual({
      id: pending[0].id,
      status: 'approved',
    });
    expect(registrationNotifier.registrationApproved).toHaveBeenCalledWith(pending[0].id);
  });

  it('denies a registration with the body reason', async () => {
    const { controller, pending, repository, registrationNotifier } = setup();

    await expect(
      controller.deny(ADMIN, pending[0].id, { reason: ' no ' }),
    ).resolves.toEqual({ id: pending[0].id, status: 'denied' });
    expect(registrationNotifier.registrationDenied).toHaveBeenCalledWith(pending[0].id, 'no');

    const stored = (
      repository.updateIfPending.mock.calls[0] as unknown as [User]
    )[0];
    expect(stored.denialReason).toBe('no');
    expect(stored.deniedAt).toEqual(NOW);
  });

  it('denies without a body', async () => {
    const { controller, pending, repository } = setup();

    await controller.deny(ADMIN, pending[0].id, undefined);

    const stored = (
      repository.updateIfPending.mock.calls[0] as unknown as [User]
    )[0];
    expect(stored.denialReason).toBeUndefined();
  });
});
