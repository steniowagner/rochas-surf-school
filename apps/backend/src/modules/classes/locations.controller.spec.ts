import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { Location } from '@rochas-surf-school/classes';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import type { PrismaClassAudienceReader } from '../enrolment/class-audience-reader.prisma.js';
import type { NotificationsLocationChangeNotifier } from '../notifications/notifications.location-change-notifier.js';
import type { GooglePlacesAddressSuggestionProvider } from './google-places.address-suggestions.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { LocationsController } from './locations.controller.js';
import type { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-18T12:00:00.000Z');
const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const STUDENT_ID = '4e8a1c73-9d2b-4f65-8b0a-6c3d7e1f9a28';
const INSTRUCTOR_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';

function userOf(role: string, status = 'approved'): AuthenticatedUser {
  return {
    id: ADMIN_ID,
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
  let stored = [
    new Location({ name: 'Praia', address: 'Av. Beira Mar', latitude: -3.73, longitude: -38.5 }),
  ];
  const repository = {
    findActive: vi.fn(async () => stored.map((location) => ({ location, upcomingClasses: 3 }))),
    findById: vi.fn(async (id: string) => stored.find((item) => item.id === id) ?? null),
    existsByNameKey: vi.fn(async (key: string) => stored.some((item) => item.nameKey === key)),
    create: vi.fn(async (location: Location) => {
      stored.push(location);
      return location;
    }),
    update: vi.fn(async (location: Location) => {
      stored = stored.map((item) => (item.id === location.id ? location : item));
      return location;
    }),
    archive: vi.fn(async () => true),
    findUpcomingInstructorCounts: vi.fn(async () => [{ instructorId: INSTRUCTOR_ID, count: 2 }]),
  };
  const notifier = { locationChanged: vi.fn(async () => undefined) };
  const provider = {
    suggest: vi.fn(async () => [{ placeId: 'p1', title: 'Praia do Futuro', description: 'Fortaleza' }]),
    findPlace: vi.fn(async () => ({ address: 'Rua A', latitude: 1, longitude: 2, name: 'Praia' })),
  };
  const audience = { findLocationAudience: vi.fn(async () => [{ userId: STUDENT_ID, count: 2 }]) };
  const controller = new LocationsController(
    repository as unknown as PrismaLocationRepository,
    { now: () => NOW } as unknown as SystemClockProvider,
    notifier as unknown as NotificationsLocationChangeNotifier,
    provider as unknown as GooglePlacesAddressSuggestionProvider,
    audience as unknown as PrismaClassAudienceReader,
  );
  return { controller, repository, notifier, provider, audience, stored: () => stored };
}

describe('LocationsController', () => {
  it.each([
    ['list', RequestMethod.GET, HttpStatus.OK, '/'],
    ['create', RequestMethod.POST, HttpStatus.CREATED, '/'],
    ['suggestions', RequestMethod.GET, HttpStatus.OK, 'address-suggestions'],
    ['place', RequestMethod.GET, HttpStatus.OK, 'address-suggestions/:placeId'],
    ['edit', RequestMethod.PUT, HttpStatus.OK, ':id'],
    ['archive', RequestMethod.POST, HttpStatus.NO_CONTENT, ':id/archive'],
  ] as const)('%s is a protected route answering %s', (name, method, status, path) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('declares the suggestion routes before the :id ones', () => {
    const order = Object.getOwnPropertyNames(LocationsController.prototype).filter((name) => name !== 'constructor');

    expect(order.indexOf('suggestions')).toBeLessThan(order.indexOf('edit'));
    expect(order.indexOf('place')).toBeLessThan(order.indexOf('archive'));
  });

  it('lists the active locations with their point and upcoming classes for any approved account', async () => {
    const { controller } = setup();

    const out = await controller.list(userOf('student'));

    expect(out.items).toEqual([
      {
        id: expect.any(String),
        name: 'Praia',
        address: 'Av. Beira Mar',
        latitude: -3.73,
        longitude: -38.5,
        upcomingClasses: 3,
      },
    ]);
  });

  it('refuses to list for an account that is not approved', async () => {
    const { controller } = setup();

    await expect(controller.list(userOf('student', 'pending'))).rejects.toMatchObject({
      statusCode: 403,
      message: 'user.status.notApproved',
    });
  });

  it('creates a location with its point for an admin', async () => {
    const { controller, stored } = setup();

    const out = await controller.create(userOf('admin'), {
      name: ' Futuro ',
      address: ' Rua A ',
      latitude: -3.74,
      longitude: -38.46,
    });

    expect(out).toEqual({
      id: expect.any(String),
      name: 'Futuro',
      address: 'Rua A',
      latitude: -3.74,
      longitude: -38.46,
      upcomingClasses: 0,
    });
    expect(stored()).toHaveLength(2);
  });

  it('answers 422 when creating without a body', async () => {
    const { controller } = setup();

    await expect(controller.create(userOf('admin'), undefined)).rejects.toMatchObject({
      statusCode: 422,
      errors: [
        expect.objectContaining({ message: 'location.name.required' }),
        expect.objectContaining({ message: 'location.address.required' }),
        expect.objectContaining({ message: 'location.point.required' }),
      ],
    });
  });

  it('answers 403 when a student creates', async () => {
    const { controller } = setup();

    await expect(
      controller.create(userOf('student'), { name: 'Futuro', address: 'Rua A', latitude: 1, longitude: 2 }),
    ).rejects.toMatchObject({ statusCode: 403, message: 'user.role.notAdmin' });
  });

  it('answers 409 for a duplicated name', async () => {
    const { controller } = setup();

    await expect(
      controller.create(userOf('admin'), { name: 'PRAIA', address: 'Rua A', latitude: 1, longitude: 2 }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'location.name.duplicate' });
  });

  it('edits a location, telling the instructors when asked', async () => {
    const { controller, stored, notifier } = setup();
    const id = stored()[0].id;

    const out = await controller.edit(userOf('admin'), id, {
      name: 'Praia Nova',
      address: 'Rua B',
      latitude: 1,
      longitude: 2,
      notify: true,
    });

    expect(out).toEqual({
      id,
      name: 'Praia Nova',
      address: 'Rua B',
      latitude: 1,
      longitude: 2,
      upcomingClasses: 3,
    });
    expect(notifier.locationChanged).toHaveBeenCalledWith({
      recipients: [
        { userId: INSTRUCTOR_ID, count: 2 },
        { userId: STUDENT_ID, count: 2 },
      ],
      locationName: 'Praia Nova',
    });
  });

  it('answers 404 when editing an unknown location and 422 without a body', async () => {
    const { controller, stored } = setup();

    await expect(controller.edit(userOf('admin'), 'nope', undefined)).rejects.toMatchObject({
      statusCode: 404,
      message: 'location.notFound',
    });
    await expect(controller.edit(userOf('admin'), stored()[0].id, undefined)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('archives a location', async () => {
    const { controller, repository, stored } = setup();

    await expect(controller.archive(userOf('admin'), stored()[0].id)).resolves.toBeUndefined();

    expect(repository.archive).toHaveBeenCalledWith(stored()[0].id);
  });

  it('answers 403 when an instructor archives', async () => {
    const { controller, stored } = setup();

    await expect(controller.archive(userOf('instructor'), stored()[0].id)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('suggests addresses, passing the query, the token and the language', async () => {
    const { controller, provider } = setup();

    const out = await controller.suggestions(userOf('admin'), ' praia do fut ', 'abc123', 'en');

    expect(out.items).toEqual([{ placeId: 'p1', title: 'Praia do Futuro', description: 'Fortaleza' }]);
    expect(provider.suggest).toHaveBeenCalledWith({
      query: 'praia do fut',
      sessionToken: 'abc123',
      language: 'en',
    });
  });

  it('answers 422 for a short query and 403 for a student', async () => {
    const { controller } = setup();

    await expect(controller.suggestions(userOf('admin'), 'ab', 'abc123')).rejects.toMatchObject({
      statusCode: 422,
    });
    await expect(controller.suggestions(userOf('student'), 'praia', 'abc123')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('finds the place behind a suggestion', async () => {
    const { controller, provider } = setup();

    const out = await controller.place(userOf('admin'), 'p1', 'abc123');

    expect(out).toEqual({ address: 'Rua A', latitude: 1, longitude: 2, name: 'Praia' });
    expect(provider.findPlace).toHaveBeenCalledWith({
      placeId: 'p1',
      sessionToken: 'abc123',
      language: 'pt-BR',
    });
  });

  it('answers 404 for an unknown place', async () => {
    const { controller, provider } = setup();
    provider.findPlace.mockResolvedValue(null as never);

    await expect(controller.place(userOf('admin'), 'x', 'abc123')).rejects.toMatchObject({
      statusCode: 404,
      message: 'location.place.notFound',
    });
  });
});
