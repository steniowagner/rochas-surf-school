import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { User } from '@rochas-surf-school/auth';
import { ConflictError, ForbiddenError, ValidationException } from '@rochas-surf-school/shared';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import type { ClassesTeachingReleaser } from '../classes/classes.teaching-releaser.js';
import type { EnrolmentSeatReleaser } from '../enrolment/enrolment.seat-releaser.js';
import type { NotificationsRoleChangeNotifier } from '../notifications/notifications.role-change-notifier.js';
import { PeopleController } from './people.controller.js';
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
    updateKeepingAnAdmin: vi.fn(async () => 'updated'),
  };
  const seatReleaser = { releaseSeats: vi.fn(async () => 1) };
  const teachingReleaser = { releaseUpcomingClasses: vi.fn(async () => 0) };
  const roleChangeNotifier = { roleChanged: vi.fn(async () => undefined) };
  const controller = new PeopleController(
    repository as unknown as PrismaUserRepository,
    seatReleaser as unknown as EnrolmentSeatReleaser,
    teachingReleaser as unknown as ClassesTeachingReleaser,
    roleChangeNotifier as unknown as NotificationsRoleChangeNotifier,
  );
  return { controller, repository, seatReleaser, teachingReleaser, roleChangeNotifier, people };
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
    );

    expect(repository.findDirectoryPage).toHaveBeenCalledWith({
      page: 2,
      perPage: 10,
      roles: ['instructor', 'admin'],
      search: 'joao',
    });
    expect(result).toEqual({
      items: [
        {
          id: people[0].id,
          name: 'Ana Silva',
          role: 'student',
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
      ).resolves.toEqual({ id: ana.id, role: 'instructor' });

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
});
