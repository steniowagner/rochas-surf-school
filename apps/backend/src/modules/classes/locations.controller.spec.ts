import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { Location } from '@rochas-surf-school/classes';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { LocationsController } from './locations.controller.js';

function userOf(role: string, status = 'approved'): AuthenticatedUser {
  return {
    id: '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34',
    email: 'user@example.com',
    role,
    status,
    claims: {},
  } as unknown as AuthenticatedUser;
}

function handlerOf(name: keyof LocationsController): object {
  return Object.getOwnPropertyDescriptor(LocationsController.prototype, name)!.value as object;
}

function setup() {
  const stored = [new Location({ name: 'Praia', address: 'Av. Beira Mar' })];
  const repository = {
    findAll: vi.fn(async () => [...stored]),
    existsByNameKey: vi.fn(async (key: string) => stored.some((item) => item.nameKey === key)),
    create: vi.fn(async (location: Location) => {
      stored.push(location);
      return location;
    }),
  };
  const controller = new LocationsController(repository as unknown as PrismaLocationRepository);
  return { controller, repository, stored };
}

describe('LocationsController', () => {
  it.each([
    ['list', RequestMethod.GET, HttpStatus.OK],
    ['create', RequestMethod.POST, HttpStatus.CREATED],
  ] as const)('%s is a protected route answering %s', (name, method, status) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('lists the locations for any approved account', async () => {
    const { controller } = setup();

    const out = await controller.list(userOf('student'));

    expect(out.items).toEqual([
      { id: expect.any(String), name: 'Praia', address: 'Av. Beira Mar' },
    ]);
  });

  it('refuses to list for an account that is not approved', async () => {
    const { controller } = setup();

    await expect(controller.list(userOf('student', 'pending'))).rejects.toMatchObject({
      statusCode: 403,
      message: 'user.status.notApproved',
    });
  });

  it('creates a location for an admin', async () => {
    const { controller, stored } = setup();

    const out = await controller.create(userOf('admin'), { name: ' Futuro ', address: ' Rua A ' });

    expect(out).toEqual({ id: expect.any(String), name: 'Futuro', address: 'Rua A' });
    expect(stored).toHaveLength(2);
  });

  it('answers 422 when creating without a body', async () => {
    const { controller } = setup();

    await expect(controller.create(userOf('admin'), undefined)).rejects.toMatchObject({
      statusCode: 422,
      errors: [
        expect.objectContaining({ message: 'location.name.required' }),
        expect.objectContaining({ message: 'location.address.required' }),
      ],
    });
  });

  it('answers 403 when a student creates', async () => {
    const { controller } = setup();

    await expect(
      controller.create(userOf('student'), { name: 'Futuro', address: 'Rua A' }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'user.role.notAdmin' });
  });

  it('answers 409 for a duplicated name', async () => {
    const { controller } = setup();

    await expect(
      controller.create(userOf('admin'), { name: 'PRAIA', address: 'Rua A' }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'location.name.duplicate' });
  });
});
