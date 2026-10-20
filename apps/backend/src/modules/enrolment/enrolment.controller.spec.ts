import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { Enrolment } from '@rochas-surf-school/enrolment';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import type { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { EnrolmentController } from './enrolment.controller.js';
import type { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import type { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import type { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const INSTRUCTOR_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const CLASS_ID = '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const NOW = new Date('2026-10-18T12:00:00.000Z');
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');

function userOf(role: string, status = 'approved', id = STUDENT_ID): AuthenticatedUser {
  return { id, email: 's@example.com', role, status, claims: {} } as unknown as AuthenticatedUser;
}

function handlerOf(name: keyof EnrolmentController): object {
  return Object.getOwnPropertyDescriptor(EnrolmentController.prototype, name)!.value as object;
}

function setup() {
  const stored: Enrolment[] = [];
  const enrolmentRepository = {
    create: vi.fn(async (enrolment: Enrolment) => {
      stored.push(enrolment);
      return enrolment;
    }),
    findById: vi.fn(async (id: string) => stored.find((item) => item.id === id) ?? null),
    withdraw: vi.fn(async () => true),
  };
  const classReader = {
    findById: vi.fn(async (id: string) =>
      id === CLASS_ID
        ? {
            id: CLASS_ID,
            discipline: 'surf',
            startsAt: STARTS_AT,
            endsAt: new Date(STARTS_AT.getTime() + 3600_000),
            capacity: 8,
            cancelledAt: null,
            instructorIds: [INSTRUCTOR_ID],
            hasCancellationRule: true,
          }
        : null,
    ),
  };
  const studentNameReader = { findName: vi.fn(async () => 'Ana Souza') };
  const notifier = {
    seatRequested: vi.fn(async () => undefined),
    requestExpired: vi.fn(async () => undefined),
  };
  const controller = new EnrolmentController(
    enrolmentRepository as unknown as PrismaEnrolmentRepository,
    classReader as unknown as PrismaEnrolmentClassReader,
    studentNameReader as unknown as PrismaStudentNameReader,
    notifier as unknown as NotificationsEnrolmentNotifier,
    { now: () => NOW } as SystemClockProvider,
  );

  return { controller, enrolmentRepository, notifier, stored };
}

describe('EnrolmentController', () => {
  it.each([
    ['request', 'classes/:id/enrolments', RequestMethod.POST, HttpStatus.CREATED],
    ['withdraw', 'enrolments/:id/withdraw', RequestMethod.POST, HttpStatus.OK],
  ] as const)('%s is a protected %s route answering %s', (name, path, method, status) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  describe('request', () => {
    it('stores a pending enrolment and notifies the class people', async () => {
      const { controller, stored, notifier } = setup();

      const out = await controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true });

      expect(out).toEqual({ id: stored[0]!.id, classId: CLASS_ID, status: 'pending', requestedAt: NOW });
      expect(stored[0]!.ruleAcceptedAt).toEqual(NOW);
      expect(notifier.seatRequested).toHaveBeenCalledWith({
        classId: CLASS_ID,
        studentName: 'Ana Souza',
        discipline: 'surf',
        startsAt: STARTS_AT,
        instructorIds: [INSTRUCTOR_ID],
      });
    });

    it.each([[undefined], [{}], [{ acceptCancellationRule: false }]])(
      'answers 422 enrolment.rule.notAccepted for the body %j',
      async (body) => {
        const { controller, stored } = setup();

        await expect(controller.request(userOf('student'), CLASS_ID, body)).rejects.toMatchObject({
          statusCode: 422,
          message: 'enrolment.rule.notAccepted',
        });
        expect(stored).toEqual([]);
      },
    );

    it('answers 403 for a pending account and for an instructor or an admin', async () => {
      const { controller } = setup();

      await expect(
        controller.request(userOf('student', 'pending'), CLASS_ID, { acceptCancellationRule: true }),
      ).rejects.toMatchObject({ statusCode: 403, message: 'user.status.notApproved' });
      for (const role of ['instructor', 'admin']) {
        await expect(
          controller.request(userOf(role), CLASS_ID, { acceptCancellationRule: true }),
        ).rejects.toMatchObject({ statusCode: 403, message: 'enrolment.role.notStudent' });
      }
    });

    it('answers 404 class.notFound for an unknown or malformed class', async () => {
      const { controller } = setup();

      for (const id of [INSTRUCTOR_ID, 'not-a-uuid']) {
        await expect(
          controller.request(userOf('student'), id, { acceptCancellationRule: true }),
        ).rejects.toMatchObject({ statusCode: 404, message: 'class.notFound' });
      }
    });
  });

  describe('withdraw', () => {
    it('withdraws the pending enrolment of the caller', async () => {
      const { controller, stored, enrolmentRepository } = setup();
      await controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true });

      const out = await controller.withdraw(userOf('student'), stored[0]!.id);

      expect(out).toEqual({ id: stored[0]!.id, classId: CLASS_ID, status: 'withdrawn', requestedAt: NOW });
      expect(enrolmentRepository.withdraw).toHaveBeenCalledWith(stored[0]!.id, NOW);
    });

    it("answers 404 enrolment.notFound for another person's or an unknown enrolment", async () => {
      const { controller, stored } = setup();
      await controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true });

      await expect(
        controller.withdraw(userOf('student', 'approved', INSTRUCTOR_ID), stored[0]!.id),
      ).rejects.toMatchObject({ statusCode: 404, message: 'enrolment.notFound' });
      await expect(controller.withdraw(userOf('student'), 'not-a-uuid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'enrolment.notFound',
      });
    });

    it('answers 409 enrolment.notPending when the conditional write loses', async () => {
      const { controller, stored, enrolmentRepository } = setup();
      await controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true });
      enrolmentRepository.withdraw.mockResolvedValueOnce(false);

      await expect(controller.withdraw(userOf('student'), stored[0]!.id)).rejects.toMatchObject({
        statusCode: 409,
        message: 'enrolment.notPending',
      });
    });

    it('answers 403 for a pending account', async () => {
      const { controller } = setup();

      await expect(controller.withdraw(userOf('student', 'pending'), CLASS_ID)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.status.notApproved',
      });
    });
  });
});
