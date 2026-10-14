import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { User } from '@rochas-surf-school/auth';
import { ForbiddenError, ValidationException } from '@rochas-surf-school/shared';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
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

function person(whatsappVisible: boolean): User {
  return new User({
    name: 'Ana Silva',
    email: 'ana@example.com',
    whatsappNumber: '+5585999998888',
    whatsappVisible,
    role: 'student',
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
  };
  const controller = new PeopleController(repository as unknown as PrismaUserRepository);
  return { controller, repository, people };
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
      'instructor',
      ' joao ',
    );

    expect(repository.findDirectoryPage).toHaveBeenCalledWith({
      page: 2,
      perPage: 10,
      role: 'instructor',
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
      role: undefined,
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
});
