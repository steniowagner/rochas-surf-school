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
import { PrismaClassesTakenCounter } from '../enrolment/classes-taken-counter.prisma.js';
import { NotificationsReactivationNotifier } from '../notifications/notifications.reactivation-notifier.js';
import { ReactivationRequestsController } from './reactivation-requests.controller.js';
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
const NOW = new Date('2026-10-26T12:00:00.000Z');

function handlerOf(name: keyof ReactivationRequestsController): object {
  return Object.getOwnPropertyDescriptor(ReactivationRequestsController.prototype, name)!
    .value as object;
}

function requestedUser(): User {
  return new User({
    name: 'Ana Souza',
    email: 'ana@example.com',
    whatsappVisible: false,
    role: 'instructor',
    status: 'deleted',
    deletedAt: new Date('2026-10-01T08:00:00.000Z'),
    reactivationStatus: 'requested',
    reactivationRequestedAt: new Date('2026-10-05T10:00:00.000Z'),
  });
}

function setup(users: User[] = [requestedUser()]) {
  const repository = {
    findReactivationRequests: vi.fn(async () => users),
    findById: vi.fn(async (id: string) => users.find((u) => u.id === id) ?? null),
    updateIfReactivationRequested: vi.fn(async () => true),
  };
  const counter = { countTaken: vi.fn(async (ids: string[]) => Object.fromEntries(ids.map((id) => [id, 3]))) };
  const notifier = {
    reactivationApproved: vi.fn().mockResolvedValue(undefined),
    reactivationDenied: vi.fn().mockResolvedValue(undefined),
  };
  const controller = new ReactivationRequestsController(
    repository as unknown as PrismaUserRepository,
    counter as unknown as PrismaClassesTakenCounter,
    { now: () => NOW } as unknown as SystemClockProvider,
    notifier as unknown as NotificationsReactivationNotifier,
  );
  return { controller, repository, counter, notifier, users };
}

describe('ReactivationRequestsController', () => {
  it.each([
    ['list', '/', RequestMethod.GET],
    ['approve', ':id/approve', RequestMethod.POST],
    ['deny', ':id/deny', RequestMethod.POST],
  ] as const)('%s is a protected %s route answering 200', (name, path, method) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('lists the requests with the classes taken for an admin', async () => {
    const { controller, counter, users } = setup();

    await expect(controller.list(ADMIN)).resolves.toEqual({
      items: [
        {
          id: users[0].id,
          name: 'Ana Souza',
          photoUrl: null,
          email: 'ana@example.com',
          role: 'instructor',
          deletedAt: '2026-10-01T08:00:00.000Z',
          requestedAt: '2026-10-05T10:00:00.000Z',
          classesTaken: 3,
        },
      ],
    });
    expect(counter.countTaken).toHaveBeenCalledWith([users[0].id], NOW);
  });

  it('refuses a student', async () => {
    const { controller } = setup();

    await expect(controller.list(userOf('student', 'approved'))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('approves a request', async () => {
    const { controller, users, notifier } = setup();

    await expect(controller.approve(ADMIN, users[0].id)).resolves.toEqual({
      id: users[0].id,
      decision: 'approved',
    });
    expect(notifier.reactivationApproved).toHaveBeenCalledWith(users[0].id);
  });

  it('denies a request with the body reason', async () => {
    const { controller, users, repository, notifier } = setup();

    await expect(controller.deny(ADMIN, users[0].id, { reason: ' full ' })).resolves.toEqual({
      id: users[0].id,
      decision: 'denied',
    });
    expect(notifier.reactivationDenied).toHaveBeenCalledWith(users[0].id, 'full');
    const stored = (repository.updateIfReactivationRequested.mock.calls[0] as unknown as [User])[0];
    expect(stored.denialReason).toBe('full');
    expect(stored.reactivationStatus).toBe('denied');
  });

  it('denies without a body', async () => {
    const { controller, users, repository } = setup();

    await controller.deny(ADMIN, users[0].id, undefined);

    const stored = (repository.updateIfReactivationRequested.mock.calls[0] as unknown as [User])[0];
    expect(stored.denialReason).toBeUndefined();
  });
});
