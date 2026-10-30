import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { User } from '@rochas-surf-school/auth';
import { ConflictError, ForbiddenError, NotFoundError, ValidationException } from '@rochas-surf-school/shared';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import type { ClassesTeachingReleaser } from '../classes/classes.teaching-releaser.js';
import type { EnrolmentSeatReleaser } from '../enrolment/enrolment.seat-releaser.js';
import type { NotificationsAccountRemovalNotifier } from '../notifications/notifications.account-removal-notifier.js';
import type { NotificationsRoleChangeNotifier } from '../notifications/notifications.role-change-notifier.js';
import { PeopleController } from './people.controller.js';
import type { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

const NOW = new Date('2026-10-30T12:00:00.000Z');

function userOf(role: string, status: string): AuthenticatedUser {
  return {
    id: '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34',
    email: `${role}@example.com`,
    role,
    status,
    claims: {},
  } as unknown as AuthenticatedUser;
}

function person(whatsappVisible: boolean, role: User['role'] = 'student'): User {
  return new User({
    name: 'Ana Silva',
    email: 'ana@example.com',
    whatsappNumber: '+5585999998888',
    whatsappVisible,
    role,
    status: 'approved',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
  });
}

function setup(people: User[] = [person(false)]) {
  const repository = {
    findDirectoryPage: vi.fn(async () => ({
      items: people,
      page: 1,
      perPage: 20,
      total: people.length,
    })),
    findById: vi.fn(async (id: string) => people.find((item) => item.id === id) ?? null),
    updateKeepingAnAdmin: vi.fn(async (): Promise<string> => 'updated'),
    findRemovedSince: vi.fn(async () => people),
    updateIfRemoved: vi.fn(async () => true),
  };
  const seatReleaser = { releaseSeats: vi.fn(async () => 1) };
  const teachingReleaser = { releaseUpcomingClasses: vi.fn(async () => 0) };
  const roleChangeNotifier = { roleChanged: vi.fn(async () => undefined) };
  const accountRemovalNotifier = {
    accountRemoved: vi.fn(async () => undefined),
    accountRestored: vi.fn(async () => undefined),
  };
  const clock = { now: vi.fn(() => NOW) };
  const controller = new PeopleController(
    repository as unknown as PrismaUserRepository,
    seatReleaser as unknown as EnrolmentSeatReleaser,
    teachingReleaser as unknown as ClassesTeachingReleaser,
    roleChangeNotifier as unknown as NotificationsRoleChangeNotifier,
    accountRemovalNotifier as unknown as NotificationsAccountRemovalNotifier,
    clock as unknown as SystemClockProvider,
  );
  return {
    controller,
    repository,
    seatReleaser,
    teachingReleaser,
    roleChangeNotifier,
    accountRemovalNotifier,
    people,
  };
}

describe('PeopleController', () => {
  it('list is a protected GET / route answering 200', () => {
    const handler = Object.getOwnPropertyDescriptor(PeopleController.prototype, 'list')!
      .value as object;

    expect(Reflect.getMetadata(PATH_METADATA, PeopleController)).toBe('people');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('passes the parsed query to the repository and hides a number from a student', async () => {
    const { controller, repository, people } = setup();

    const result = await controller.list(
      userOf('student', 'approved'),
      '2',
      '10',
      'instructor,admin',
      ' joao ',
      'true',
    );

    expect(repository.findDirectoryPage).toHaveBeenCalledWith({
      page: 2,
      perPage: 10,
      roles: ['instructor', 'admin'],
      search: 'joao',
      teachers: true,
    });
    expect(result).toEqual({
      items: [
        {
          id: people[0].id,
          name: 'Ana Silva',
          photoUrl: null,
          role: 'student',
          isInstructor: false,
          createdAt: '2026-10-01T10:00:00.000Z',
          whatsappNumber: null,
        },
      ],
      page: 1,
      perPage: 20,
      total: 1,
    });
  });

  it('shows the number to an admin and applies the defaults', async () => {
    const { controller, repository } = setup();

    const result = await controller.list(userOf('admin', 'approved'));

    expect(repository.findDirectoryPage).toHaveBeenCalledWith({
      page: 1,
      perPage: 20,
      roles: undefined,
      search: undefined,
    });
    expect(result.items[0].whatsappNumber).toBe('+5585999998888');
  });

  it('refuses an account that is not approved', async () => {
    const { controller } = setup();

    await expect(controller.list(userOf('admin', 'pending'))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('answers a validation error for a bad query', async () => {
    const { controller } = setup();

    await expect(
      controller.list(userOf('student', 'approved'), '0'),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  describe('PUT /people/:id/role', () => {
    it('changeRole is a protected PUT :id/role route answering 200', () => {
      const handler = Object.getOwnPropertyDescriptor(PeopleController.prototype, 'changeRole')!
        .value as object;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/role');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PUT);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it("runs ChangeRole with the caller as actor, releasing a student's seats and telling them", async () => {
      const { controller, repository, seatReleaser, teachingReleaser, roleChangeNotifier, people } = setup();
      const ana = people[0]!;

      await expect(
        controller.changeRole(userOf('admin', 'approved'), ana.id, { role: 'instructor' }),
      ).resolves.toEqual({ id: ana.id, role: 'instructor', isInstructor: false });

      expect(seatReleaser.releaseSeats).toHaveBeenCalledWith(ana.id);
      expect(teachingReleaser.releaseUpcomingClasses).not.toHaveBeenCalled();
      expect(repository.updateKeepingAnAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: ana.id, role: 'instructor' }),
        { role: 'student', status: 'approved' },
      );
      expect(roleChangeNotifier.roleChanged).toHaveBeenCalledWith({
        userId: ana.id,
        role: 'instructor',
        seatsReleased: true,
        classesReleased: false,
      });
    });

    it('releases a demoted instructor from their classes with the caller as actor', async () => {
      const { controller, teachingReleaser, people } = setup([person(false, 'instructor')]);
      const admin = userOf('admin', 'approved');

      await controller.changeRole(admin, people[0]!.id, { role: 'student' });

      expect(teachingReleaser.releaseUpcomingClasses).toHaveBeenCalledWith(people[0]!.id, admin.id);
    });

    it('stores the instructor flag sent with a promotion to admin', async () => {
      const { controller, repository, people } = setup();

      await expect(
        controller.changeRole(userOf('admin', 'approved'), people[0]!.id, {
          role: 'admin',
          isInstructor: true,
        }),
      ).resolves.toEqual({ id: people[0]!.id, role: 'admin', isInstructor: true });

      expect(repository.updateKeepingAnAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'admin', isInstructor: true }),
        { role: 'student', status: 'approved' },
      );
    });

    it('answers people.role.invalid without a body', async () => {
      const { controller, people } = setup();

      await expect(
        controller.changeRole(userOf('admin', 'approved'), people[0]!.id, undefined),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('refuses a caller who is not an admin, and a write that would leave no admin', async () => {
      const { controller, repository, people } = setup([person(false, 'admin')]);

      await expect(
        controller.changeRole(userOf('instructor', 'approved'), people[0]!.id, { role: 'instructor' }),
      ).rejects.toBeInstanceOf(ForbiddenError);

      repository.updateKeepingAnAdmin.mockResolvedValue('lastAdmin');
      await expect(
        controller.changeRole(userOf('admin', 'approved'), people[0]!.id, { role: 'instructor' }),
      ).rejects.toEqual(new ConflictError('user.role.lastAdmin'));
    });
  });

  describe('PUT /people/:id/instructor', () => {
    it('setInstructorFlag is a protected PUT :id/instructor route answering 200', () => {
      const handler = Object.getOwnPropertyDescriptor(PeopleController.prototype, 'setInstructorFlag')!
        .value as object;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/instructor');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PUT);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs SetInstructorFlag with the caller as actor, writing only an approved admin', async () => {
      const { controller, repository, roleChangeNotifier, people } = setup([person(false, 'admin')]);
      const bia = people[0]!;

      await expect(
        controller.setInstructorFlag(userOf('admin', 'approved'), bia.id, { isInstructor: true }),
      ).resolves.toEqual({ id: bia.id, isInstructor: true });

      expect(repository.updateKeepingAnAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: bia.id, isInstructor: true }),
        { role: 'admin', status: 'approved' },
      );
      expect(roleChangeNotifier.roleChanged).not.toHaveBeenCalled();
    });

    it('answers people.isInstructor.invalid without a body', async () => {
      const { controller, people } = setup([person(false, 'admin')]);

      await expect(
        controller.setInstructorFlag(userOf('admin', 'approved'), people[0]!.id, undefined),
      ).rejects.toBeInstanceOf(ValidationException);
    });

    it('refuses a caller who is not an admin, and a student', async () => {
      const { controller, people } = setup();

      await expect(
        controller.setInstructorFlag(userOf('instructor', 'approved'), people[0]!.id, { isInstructor: true }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        controller.setInstructorFlag(userOf('admin', 'approved'), people[0]!.id, { isInstructor: true }),
      ).rejects.toEqual(new ConflictError('people.isInstructor.notAdmin'));
    });
  });

  describe('POST /people/:id/remove', () => {
    it('remove is a protected POST :id/remove route answering 200', () => {
      const handler = Object.getOwnPropertyDescriptor(PeopleController.prototype, 'remove')!
        .value as object;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/remove');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs RemoveUser with the caller as actor: releases, writes, tells the person', async () => {
      const { controller, repository, seatReleaser, teachingReleaser, accountRemovalNotifier, people } =
        setup();
      const ana = people[0]!;
      const admin = userOf('admin', 'approved');

      await expect(controller.remove(admin, ana.id)).resolves.toEqual({
        id: ana.id,
        status: 'removed',
      });

      expect(seatReleaser.releaseSeats).toHaveBeenCalledWith(ana.id);
      expect(teachingReleaser.releaseUpcomingClasses).toHaveBeenCalledWith(ana.id, admin.id);
      expect(repository.updateKeepingAnAdmin).toHaveBeenCalledWith(
        expect.objectContaining({ id: ana.id, status: 'removed', removedAt: NOW }),
        { role: 'student', status: 'approved' },
      );
      expect(accountRemovalNotifier.accountRemoved).toHaveBeenCalledWith(ana.id);
    });

    it('refuses a caller who is not an admin, an unknown id, and a write that would leave no admin', async () => {
      const { controller, repository, people } = setup([person(false, 'admin')]);

      await expect(
        controller.remove(userOf('instructor', 'approved'), people[0]!.id),
      ).rejects.toBeInstanceOf(ForbiddenError);
      await expect(
        controller.remove(userOf('admin', 'approved'), '6f1d3c1e-7a0b-4c7e-9b52-0f6f5f7d9a10'),
      ).rejects.toBeInstanceOf(NotFoundError);

      repository.updateKeepingAnAdmin.mockResolvedValue('lastAdmin');
      await expect(controller.remove(userOf('admin', 'approved'), people[0]!.id)).rejects.toEqual(
        new ConflictError('user.role.lastAdmin'),
      );
    });
  });

  describe('GET /people/removed', () => {
    it('listRemoved is a protected GET removed route answering 200', () => {
      const handler = Object.getOwnPropertyDescriptor(PeopleController.prototype, 'listRemoved')!
        .value as object;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('removed');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('is declared before every :id route', () => {
      const names = Object.getOwnPropertyNames(PeopleController.prototype);

      expect(names.indexOf('listRemoved')).toBeLessThan(names.indexOf('changeRole'));
    });

    it('lists the removed accounts inside the window for an admin', async () => {
      const removed = new User({
        name: 'Bia Souza',
        email: 'bia@example.com',
        whatsappVisible: false,
        role: 'instructor',
        status: 'removed',
        removedAt: new Date('2026-10-20T12:00:00.000Z'),
      });
      const { controller, repository } = setup([removed]);

      await expect(controller.listRemoved(userOf('admin', 'approved'))).resolves.toEqual({
        items: [
          {
            id: removed.id,
            name: 'Bia Souza',
            photoUrl: null,
            role: 'instructor',
            whatsappNumber: null,
            removedAt: '2026-10-20T12:00:00.000Z',
          },
        ],
      });
      expect(repository.findRemovedSince).toHaveBeenCalledWith(new Date('2026-09-30T12:00:00.000Z'));
    });

    it('refuses a caller who is not an admin', async () => {
      const { controller } = setup();

      await expect(controller.listRemoved(userOf('student', 'approved'))).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });
  });

  describe('POST /people/:id/restore', () => {
    const removedAccount = () =>
      new User({
        name: 'Bia Souza',
        email: 'bia@example.com',
        whatsappVisible: false,
        role: 'instructor',
        status: 'removed',
        removedAt: new Date('2026-10-27T12:00:00.000Z'),
      });

    it('restore is a protected POST :id/restore route answering 200', () => {
      const handler = Object.getOwnPropertyDescriptor(PeopleController.prototype, 'restore')!
        .value as object;

      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/restore');
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(HttpStatus.OK);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    });

    it('runs RestoreAccount: writes the approved account and tells the person', async () => {
      const bia = removedAccount();
      const { controller, repository, accountRemovalNotifier } = setup([bia]);

      await expect(controller.restore(userOf('admin', 'approved'), bia.id)).resolves.toEqual({
        id: bia.id,
        status: 'approved',
      });

      expect(repository.updateIfRemoved).toHaveBeenCalledWith(
        expect.objectContaining({ id: bia.id, status: 'approved', removedAt: undefined }),
      );
      expect(accountRemovalNotifier.accountRestored).toHaveBeenCalledWith(bia.id);
    });

    it('refuses an account that is not removed', async () => {
      const ana = person(false);
      const { controller, repository, accountRemovalNotifier } = setup([ana]);

      await expect(controller.restore(userOf('admin', 'approved'), ana.id)).rejects.toEqual(
        new ConflictError('user.status.notRemoved'),
      );
      expect(repository.updateIfRemoved).not.toHaveBeenCalled();
      expect(accountRemovalNotifier.accountRestored).not.toHaveBeenCalled();
    });

    it('answers 409 and tells nobody when another restore won the race', async () => {
      const bia = removedAccount();
      const { controller, repository, accountRemovalNotifier } = setup([bia]);
      repository.updateIfRemoved.mockResolvedValue(false);

      await expect(controller.restore(userOf('admin', 'approved'), bia.id)).rejects.toEqual(
        new ConflictError('user.status.notRemoved'),
      );
      expect(accountRemovalNotifier.accountRestored).not.toHaveBeenCalled();
    });
  });
});
