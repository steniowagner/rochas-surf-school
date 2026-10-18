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
import { NotificationsClassChangeNotifier } from '../notifications/notifications.class-change-notifier.js';
import { PrismaClassViewReader } from './class-view-reader.prisma.js';
import { ClassesController } from './classes.controller.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { NoEnrolmentPendingRequestCounter } from './no-enrolment.pending-request-counter.js';
import { NoEnrolmentSeatCounter } from './no-enrolment.seat-counter.js';
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
    findById: vi.fn(async (id: string) => stored.find((item) => item.id === id) ?? null),
    update: vi.fn(async (schoolClass: SchoolClass) => {
      stored.splice(0, stored.length, schoolClass);
      return true;
    }),
    cancel: vi.fn(async () => true),
    delete: vi.fn(async () => true),
  };
  const locationRepository = { findById: vi.fn(async () => location) };
  const teacherLookup = {
    findTeachers: vi.fn(async () => [{ id: INSTRUCTOR_ID, role: 'instructor', status: 'approved' }]),
  };
  const notifier = {
    classAssigned: vi.fn(async () => undefined),
    classUnassigned: vi.fn(async () => undefined),
  };
  const changeNotifier = {
    classEdited: vi.fn(async () => undefined),
    classCancelled: vi.fn(async () => undefined),
    classDeleted: vi.fn(async () => undefined),
  };
  const classViewReader = {
    findStartingBetween: vi.fn(async () => []),
    findById: vi.fn(async () => null),
  };
  const controller = new ClassesController(
    classRepository as unknown as PrismaSchoolClassRepository,
    locationRepository as unknown as PrismaLocationRepository,
    teacherLookup as unknown as PrismaTeacherLookup,
    notifier as unknown as NotificationsClassAssignmentNotifier,
    { now: () => NOW } as SystemClockProvider,
    classViewReader as unknown as PrismaClassViewReader,
    changeNotifier as unknown as NotificationsClassChangeNotifier,
    new NoEnrolmentSeatCounter(),
    new NoEnrolmentPendingRequestCounter(),
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
  return { controller, classRepository, classViewReader, notifier, changeNotifier, stored, location, body };
}

describe('ClassesController', () => {
  it.each([
    ['createBatch', 'batch', RequestMethod.POST, HttpStatus.CREATED],
    ['timeRangeSuggestions', 'time-range-suggestions', RequestMethod.GET, HttpStatus.OK],
    ['week', '/', RequestMethod.GET, HttpStatus.OK],
    ['one', ':id', RequestMethod.GET, HttpStatus.OK],
    ['edit', ':id', RequestMethod.PUT, HttpStatus.OK],
    ['cancel', ':id/cancel', RequestMethod.POST, HttpStatus.OK],
    ['remove', ':id', RequestMethod.DELETE, HttpStatus.NO_CONTENT],
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

  it('leaves out the excluded dates of the body', async () => {
    const { controller, stored, body } = setup();

    const out = await controller.createBatch(
      userOf('admin'),
      { ...body, endDate: '2026-10-17', excludedDates: ['2026-10-16'] } as never,
    );

    expect(out).toEqual({ count: 2 });
    expect(stored.map((item) => item.startsAt.toISOString().slice(0, 10))).toEqual(['2026-10-15', '2026-10-17']);
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

  it('lists the week of the date for any approved role', async () => {
    const { controller, classViewReader } = setup();

    const out = await controller.week(userOf('student'), '2026-10-15');

    expect(out).toEqual({ weekStart: '2026-10-12', items: [] });
    expect(classViewReader.findStartingBetween).toHaveBeenCalledWith(
      new Date('2026-10-12T03:00:00.000Z'),
      new Date('2026-10-19T03:00:00.000Z'),
    );
  });

  it('answers 422 for a missing date and 403 for a pending account', async () => {
    const { controller } = setup();

    await expect(controller.week(userOf('admin'))).rejects.toMatchObject({
      statusCode: 422,
      errors: [expect.objectContaining({ message: 'class.date.invalid' })],
    });
    await expect(controller.week(userOf('student', 'pending'), 'x')).rejects.toMatchObject({
      statusCode: 403,
      message: 'user.status.notApproved',
    });
  });

  it('answers 404 class.notFound for an unknown class', async () => {
    const { controller } = setup();

    await expect(controller.one(userOf('student'), INSTRUCTOR_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: 'class.notFound',
    });
  });

  it('answers one class by id', async () => {
    const { controller, classViewReader } = setup();
    classViewReader.findById.mockResolvedValueOnce({
      id: INSTRUCTOR_ID,
      discipline: 'surf',
      level: 'beginner',
      startsAt: NOW,
      endsAt: NOW,
      capacity: 8,
      notes: null,
      location: { id: 'l', name: 'Praia', address: 'Av.' },
      instructors: [],
    } as never);

    const out = await controller.one(userOf('instructor'), INSTRUCTOR_ID);

    expect(out).toMatchObject({ id: INSTRUCTOR_ID, startsAt: NOW.toISOString() });
  });

  describe('edit', () => {
    const EDITED_ID = '9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47';

    function withStoredClass() {
      const context = setup();
      const existing = new SchoolClass({
        id: EDITED_ID,
        discipline: 'surf',
        level: 'beginner',
        startsAt: new Date('2026-10-15T11:00:00.000Z'),
        endsAt: new Date('2026-10-15T12:00:00.000Z'),
        locationId: context.location.id,
        instructorIds: [INSTRUCTOR_ID],
        capacity: 8,
        createdBy: ADMIN_ID,
      });
      context.stored.push(existing);
      context.classViewReader.findById.mockImplementation((async () => ({
        id: EDITED_ID,
        discipline: 'skate',
        level: 'beginner',
        startsAt: new Date('2026-10-16T11:00:00.000Z'),
        endsAt: new Date('2026-10-16T12:00:00.000Z'),
        capacity: 8,
        notes: null,
        location: { id: context.location.id, name: 'Praia', address: 'Av.' },
        instructors: [],
      })) as never);
      const editBody = {
        discipline: 'skate',
        level: 'beginner',
        date: '2026-10-16',
        start: '08:00',
        end: '09:00',
        locationId: context.location.id,
        instructorIds: [INSTRUCTOR_ID],
        capacity: 8,
      };
      return { ...context, editBody };
    }

    it('edits the class and answers the updated class item', async () => {
      const { controller, classRepository, editBody } = withStoredClass();

      const out = await controller.edit(userOf('admin'), EDITED_ID, editBody as never);

      expect(classRepository.update).toHaveBeenCalledTimes(1);
      expect(out).toMatchObject({
        id: EDITED_ID,
        discipline: 'skate',
        startsAt: '2026-10-16T11:00:00.000Z',
      });
    });

    it('notifies the instructors kept by the edit through the change notifier', async () => {
      const { controller, changeNotifier, editBody } = withStoredClass();

      await controller.edit(userOf('admin'), EDITED_ID, editBody as never);

      expect(changeNotifier.classEdited).toHaveBeenCalledWith({
        instructorIds: [INSTRUCTOR_ID],
        classId: EDITED_ID,
        discipline: 'skate',
        startsAt: new Date('2026-10-16T11:00:00.000Z'),
      });
    });

    it('answers 422 when editing without a body', async () => {
      const { controller } = withStoredClass();

      await expect(controller.edit(userOf('admin'), EDITED_ID, undefined)).rejects.toMatchObject({
        statusCode: 422,
        errors: expect.arrayContaining([expect.objectContaining({ message: 'class.date.invalid' })]),
      });
    });

    it('answers 403 for an instructor and 404 for an unknown class', async () => {
      const { controller, editBody } = withStoredClass();

      await expect(controller.edit(userOf('instructor'), EDITED_ID, editBody as never)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.role.notAdmin',
      });
      await expect(controller.edit(userOf('admin'), INSTRUCTOR_ID, editBody as never)).rejects.toMatchObject({
        statusCode: 404,
        message: 'class.notFound',
      });
    });
  });

  describe('cancel', () => {
    const CANCELLED_ID = '9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47';
    const OTHER_INSTRUCTOR_ID = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

    function withStoredClass() {
      const context = setup();
      context.stored.push(
        new SchoolClass({
          id: CANCELLED_ID,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date('2026-10-15T11:00:00.000Z'),
          endsAt: new Date('2026-10-15T12:00:00.000Z'),
          locationId: context.location.id,
          instructorIds: [INSTRUCTOR_ID, ADMIN_ID, OTHER_INSTRUCTOR_ID],
          capacity: 8,
          createdBy: ADMIN_ID,
        }),
      );
      context.classViewReader.findById.mockImplementation((async () => ({
        id: CANCELLED_ID,
        discipline: 'surf',
        level: 'beginner',
        startsAt: new Date('2026-10-15T11:00:00.000Z'),
        endsAt: new Date('2026-10-15T12:00:00.000Z'),
        capacity: 8,
        notes: null,
        cancelledAt: NOW,
        cancellationMessage: 'Mar muito grande.',
        location: { id: context.location.id, name: 'Praia', address: 'Av.' },
        instructors: [],
      })) as never);
      return context;
    }

    it('cancels the class with the trimmed message and answers the class item', async () => {
      const { controller, classRepository } = withStoredClass();

      const out = await controller.cancel(userOf('admin'), CANCELLED_ID, { message: '  Mar muito grande.  ' });

      expect(classRepository.cancel).toHaveBeenCalledWith(CANCELLED_ID, NOW, 'Mar muito grande.');
      expect(out).toMatchObject({
        id: CANCELLED_ID,
        cancelledAt: NOW.toISOString(),
        cancellationMessage: 'Mar muito grande.',
      });
    });

    it('stores no message when there is no body', async () => {
      const { controller, classRepository } = withStoredClass();

      await controller.cancel(userOf('admin'), CANCELLED_ID, undefined);

      expect(classRepository.cancel).toHaveBeenCalledWith(CANCELLED_ID, NOW, null);
    });

    it('notifies the other instructors through the change notifier, never the caller', async () => {
      const { controller, changeNotifier } = withStoredClass();

      await controller.cancel(userOf('admin'), CANCELLED_ID, { message: 'Mar muito grande.' });

      expect(changeNotifier.classCancelled).toHaveBeenCalledWith({
        instructorIds: [INSTRUCTOR_ID, OTHER_INSTRUCTOR_ID],
        classId: CANCELLED_ID,
        discipline: 'surf',
        startsAt: new Date('2026-10-15T11:00:00.000Z'),
        message: 'Mar muito grande.',
      });
    });

    it('answers 409 class.cancelled when the cancel loses the race', async () => {
      const { controller, classRepository, changeNotifier } = withStoredClass();
      classRepository.cancel.mockResolvedValueOnce(false);

      await expect(controller.cancel(userOf('admin'), CANCELLED_ID, {})).rejects.toMatchObject({
        statusCode: 409,
        message: 'class.cancelled',
      });
      expect(changeNotifier.classCancelled).not.toHaveBeenCalled();
    });

    it('answers 403 for an instructor, 404 for an unknown class and 422 for a long message', async () => {
      const { controller } = withStoredClass();

      await expect(controller.cancel(userOf('instructor'), CANCELLED_ID, {})).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.role.notAdmin',
      });
      await expect(controller.cancel(userOf('admin'), INSTRUCTOR_ID, {})).rejects.toMatchObject({
        statusCode: 404,
        message: 'class.notFound',
      });
      await expect(
        controller.cancel(userOf('admin'), CANCELLED_ID, { message: 'm'.repeat(301) }),
      ).rejects.toMatchObject({
        statusCode: 422,
        errors: [expect.objectContaining({ message: 'class.cancellationMessage.max.length' })],
      });
    });
  });

  describe('remove', () => {
    const DELETED_ID = '9e1b7a30-4c52-4d86-b0a3-6f2d8c5e1a47';
    const OTHER_INSTRUCTOR_ID = '3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e6f';

    function withStoredClass() {
      const context = setup();
      context.stored.push(
        new SchoolClass({
          id: DELETED_ID,
          discipline: 'surf',
          level: 'beginner',
          startsAt: new Date('2026-10-15T11:00:00.000Z'),
          endsAt: new Date('2026-10-15T12:00:00.000Z'),
          locationId: context.location.id,
          instructorIds: [INSTRUCTOR_ID, ADMIN_ID, OTHER_INSTRUCTOR_ID],
          capacity: 8,
          createdBy: ADMIN_ID,
        }),
      );
      return context;
    }

    it('deletes the class and answers nothing', async () => {
      const { controller, classRepository } = withStoredClass();

      expect(await controller.remove(userOf('admin'), DELETED_ID)).toBeUndefined();

      expect(classRepository.delete).toHaveBeenCalledWith(DELETED_ID, NOW);
    });

    it('notifies the other instructors through the change notifier, never the caller', async () => {
      const { controller, changeNotifier } = withStoredClass();

      await controller.remove(userOf('admin'), DELETED_ID);

      expect(changeNotifier.classDeleted).toHaveBeenCalledWith({
        instructorIds: [INSTRUCTOR_ID, OTHER_INSTRUCTOR_ID],
        discipline: 'surf',
        startsAt: new Date('2026-10-15T11:00:00.000Z'),
      });
    });

    it('answers 404 class.notFound when the delete loses the race to another delete', async () => {
      const { controller, classRepository, stored, changeNotifier } = withStoredClass();
      classRepository.delete.mockImplementationOnce(async () => {
        stored.splice(0, stored.length);
        return false;
      });

      await expect(controller.remove(userOf('admin'), DELETED_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'class.notFound',
      });
      expect(changeNotifier.classDeleted).not.toHaveBeenCalled();
    });

    it('answers 403 for an instructor and 404 for an unknown class', async () => {
      const { controller, classRepository } = withStoredClass();

      await expect(controller.remove(userOf('instructor'), DELETED_ID)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.role.notAdmin',
      });
      await expect(controller.remove(userOf('admin'), INSTRUCTOR_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'class.notFound',
      });
      expect(classRepository.delete).not.toHaveBeenCalled();
    });
  });
});
