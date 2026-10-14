import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { Location, SchoolClass } from '@rochas-surf-school/classes';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsClassAssignmentNotifier } from '../notifications/notifications.class-assignment-notifier.js';
import { ClassesController } from './classes.controller.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaTeacherLookup } from './teacher-lookup.prisma.js';

const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const INSTRUCTOR_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const NOW = new Date('2026-10-14T13:00:00.000Z');

function userOf(role: string, status = 'approved'): AuthenticatedUser {
  return { id: ADMIN_ID, email: 'a@example.com', role, status, claims: {} } as unknown as AuthenticatedUser;
}

function handlerOf(name: keyof ClassesController): object {
  return Object.getOwnPropertyDescriptor(ClassesController.prototype, name)!.value as object;
}

function setup() {
  const location = new Location({ name: 'Praia', address: 'Av. Beira Mar' });
  const stored: SchoolClass[] = [];
  const classRepository = {
    createMany: vi.fn(async (classes: SchoolClass[]) => {
      stored.push(...classes);
    }),
    findStartingBetween: vi.fn(async () => stored),
  };
  const locationRepository = { findById: vi.fn(async () => location) };
  const teacherLookup = {
    findTeachers: vi.fn(async () => [{ id: INSTRUCTOR_ID, role: 'instructor', status: 'approved' }]),
  };
  const notifier = { classAssigned: vi.fn(async () => undefined) };
  const controller = new ClassesController(
    classRepository as unknown as PrismaSchoolClassRepository,
    locationRepository as unknown as PrismaLocationRepository,
    teacherLookup as unknown as PrismaTeacherLookup,
    notifier as unknown as NotificationsClassAssignmentNotifier,
    { now: () => NOW } as SystemClockProvider,
  );
  const body = {
    discipline: 'surf',
    level: 'beginner',
    startDate: '2026-10-15',
    endDate: '2026-10-15',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    timeRanges: [{ start: '08:00', end: '09:00' }],
    locationId: location.id,
    instructorIds: [INSTRUCTOR_ID],
    capacity: 8,
    notes: 'Bring sunscreen',
  };
  return { controller, classRepository, notifier, stored, body };
}

describe('ClassesController', () => {
  it.each([
    ['createBatch', 'batch', RequestMethod.POST, HttpStatus.CREATED],
    ['timeRangeSuggestions', 'time-range-suggestions', RequestMethod.GET, HttpStatus.OK],
  ] as const)('%s is a protected %s route answering %s', (name, path, method, status) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('creates the batch for an admin and notifies the instructor', async () => {
    const { controller, stored, notifier, body } = setup();

    const out = await controller.createBatch(userOf('admin'), body as never);

    expect(out).toEqual({ count: 1 });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ discipline: 'surf', capacity: 8, notes: 'Bring sunscreen', createdBy: ADMIN_ID });
    expect(notifier.classAssigned).toHaveBeenCalledWith({
      instructorIds: [INSTRUCTOR_ID],
      count: 1,
      discipline: 'surf',
    });
  });

  it('answers 422 when creating without a body', async () => {
    const { controller } = setup();

    await expect(controller.createBatch(userOf('admin'), undefined)).rejects.toMatchObject({
      statusCode: 422,
      errors: expect.arrayContaining([
        expect.objectContaining({ message: 'class.discipline.invalid' }),
        expect.objectContaining({ message: 'class.timeRanges.required' }),
      ]),
    });
  });

  it('answers 403 when a student creates a batch', async () => {
    const { controller, body } = setup();

    await expect(controller.createBatch(userOf('student'), body as never)).rejects.toMatchObject({
      statusCode: 403,
      message: 'user.role.notAdmin',
    });
  });

  it('lists the suggestions for an admin', async () => {
    const { controller, classRepository } = setup();

    const out = await controller.timeRangeSuggestions(userOf('admin'));

    expect(out).toEqual({ items: [] });
    expect(classRepository.findStartingBetween).toHaveBeenCalledWith(
      new Date('2026-10-05T03:00:00.000Z'),
      new Date('2026-10-12T03:00:00.000Z'),
    );
  });

  it('refuses the suggestions to an instructor and to a pending admin', async () => {
    const { controller } = setup();

    await expect(controller.timeRangeSuggestions(userOf('instructor'))).rejects.toMatchObject({
      statusCode: 403,
      message: 'user.role.notAdmin',
    });
    await expect(controller.timeRangeSuggestions(userOf('admin', 'pending'))).rejects.toMatchObject({
      statusCode: 403,
      message: 'user.status.notApproved',
    });
  });
});
