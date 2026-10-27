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
import type { PrismaStudentLookup } from './student-lookup.prisma.js';
import type { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import type { PrismaSeatCounter } from './seat-counter.prisma.js';
import type { SystemClockProvider } from './system.clock.js';
import type { PrismaWaitingListSetting } from './waiting-list-setting.prisma.js';

const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';
const INSTRUCTOR_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const CLASS_ID = '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const NOW = new Date('2026-10-18T12:00:00.000Z');
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');
const DEADLINE = new Date('2026-10-19T09:00:00.000Z');

function userOf(role: string, status = 'approved', id = STUDENT_ID): AuthenticatedUser {
  return { id, email: 's@example.com', role, status, claims: {} } as unknown as AuthenticatedUser;
}

function handlerOf(name: keyof EnrolmentController): object {
  return Object.getOwnPropertyDescriptor(EnrolmentController.prototype, name)!.value as object;
}

function setup(options: { waitingListEnabled?: boolean; seatsTaken?: number } = {}) {
  const stored: Enrolment[] = [];
  const enrolmentRepository = {
    create: vi.fn(async (enrolment: Enrolment) => {
      stored.push(enrolment);
      return enrolment;
    }),
    findById: vi.fn(async (id: string) => stored.find((item) => item.id === id) ?? null),
    withdraw: vi.fn(async () => true),
    approve: vi.fn(async () => 'approved'),
    deny: vi.fn(async () => true),
    cancel: vi.fn(async () => true),
    takeOut: vi.fn(async () => true),
    enrolDirectly: vi.fn(async (enrolment: Enrolment) => ({ result: 'enrolled', enrolment })),
    countPendingForClass: vi.fn(async () => 2),
    findPendingByClass: vi.fn(async () => [] as unknown[]),
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
            cancellationDeadline: DEADLINE,
            instructorIds: [INSTRUCTOR_ID],
            hasCancellationRule: true,
          }
        : null,
    ),
  };
  const studentNameReader = { findName: vi.fn(async () => 'Ana Souza') };
  const studentLookup = { isApprovedStudent: vi.fn(async (id: string) => id === STUDENT_ID) };
  const notifier = {
    seatRequested: vi.fn(async () => undefined),
    requestExpired: vi.fn(async () => undefined),
    requestApproved: vi.fn(async () => undefined),
    requestDenied: vi.fn(async () => undefined),
    seatCancelled: vi.fn(async () => undefined),
    studentEnrolled: vi.fn(async () => undefined),
    studentTakenOut: vi.fn(async () => undefined),
  };
  const controller = new EnrolmentController(
    enrolmentRepository as unknown as PrismaEnrolmentRepository,
    classReader as unknown as PrismaEnrolmentClassReader,
    studentNameReader as unknown as PrismaStudentNameReader,
    studentLookup as unknown as PrismaStudentLookup,
    notifier as unknown as NotificationsEnrolmentNotifier,
    { now: () => NOW } as SystemClockProvider,
    { isEnabled: async () => options.waitingListEnabled ?? true } as unknown as PrismaWaitingListSetting,
    { countSeatsTaken: async () => options.seatsTaken ?? 0 } as unknown as PrismaSeatCounter,
  );

  return { controller, enrolmentRepository, notifier, stored, studentLookup };
}

describe('EnrolmentController', () => {
  it.each([
    ['request', 'classes/:id/enrolments', RequestMethod.POST, HttpStatus.CREATED],
    ['withdraw', 'enrolments/:id/withdraw', RequestMethod.POST, HttpStatus.OK],
    ['cancel', 'enrolments/:id/cancel', RequestMethod.POST, HttpStatus.OK],
    ['approve', 'enrolments/:id/approve', RequestMethod.POST, HttpStatus.OK],
    ['deny', 'enrolments/:id/deny', RequestMethod.POST, HttpStatus.OK],
    ['enrolDirectly', 'classes/:id/enrolments/direct', RequestMethod.POST, HttpStatus.CREATED],
    ['takeOut', 'enrolments/:id/take-out', RequestMethod.POST, HttpStatus.OK],
  ] as const)('%s is a protected %s route answering %s', (name, path, method, status) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  it('lists the pending requests on a protected static GET route declared before the :id ones', () => {
    const handler = handlerOf('listPending');
    const order = Object.getOwnPropertyNames(EnrolmentController.prototype);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('enrolments/pending');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(order.indexOf('listPending')).toBeLessThan(order.indexOf('approve'));
  });

  describe('request', () => {
    it('stores a pending enrolment and notifies the class people', async () => {
      const { controller, stored, notifier } = setup();

      const out = await controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true });

      expect(out).toEqual({ id: stored[0]!.id, classId: CLASS_ID, status: 'pending', requestedAt: NOW });
      expect(stored[0]!.ruleAcceptedAt).toEqual(NOW);
      expect(notifier.seatRequested).toHaveBeenCalledWith({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
        studentName: 'Ana Souza',
        discipline: 'surf',
        startsAt: STARTS_AT,
        instructorIds: [INSTRUCTOR_ID],
      });
    });

    it('answers 409 enrolment.waitingList.closed for a full class while the waiting list is off', async () => {
      const { controller, stored } = setup({ waitingListEnabled: false, seatsTaken: 8 });

      await expect(
        controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'enrolment.waitingList.closed' });
      expect(stored).toEqual([]);
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

  describe('cancel', () => {
    function approvedSeat(stored: Enrolment[]): Enrolment {
      const seat = new Enrolment({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
        status: 'approved',
        requestedAt: NOW,
      });
      stored.push(seat);
      return seat;
    }

    it('cancels the approved seat of the caller and tells the school with the waiting count', async () => {
      const { controller, stored, enrolmentRepository, notifier } = setup();
      const seat = approvedSeat(stored);

      const out = await controller.cancel(userOf('student'), seat.id);

      expect(out).toEqual({ id: seat.id, classId: CLASS_ID, status: 'cancelled', requestedAt: NOW });
      expect(enrolmentRepository.cancel).toHaveBeenCalledWith(seat.id, NOW);
      expect(notifier.seatCancelled).toHaveBeenCalledWith({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
        studentName: 'Ana Souza',
        discipline: 'surf',
        startsAt: STARTS_AT,
        waitingCount: 2,
        instructorIds: [INSTRUCTOR_ID],
      });
    });

    it("answers 404 enrolment.notFound for another person's or a malformed enrolment", async () => {
      const { controller, stored } = setup();
      const seat = approvedSeat(stored);

      await expect(
        controller.cancel(userOf('student', 'approved', INSTRUCTOR_ID), seat.id),
      ).rejects.toMatchObject({ statusCode: 404, message: 'enrolment.notFound' });
      await expect(controller.cancel(userOf('student'), 'not-a-uuid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'enrolment.notFound',
      });
    });

    it('answers 409 enrolment.notApproved when the conditional write loses', async () => {
      const { controller, stored, enrolmentRepository } = setup();
      const seat = approvedSeat(stored);
      enrolmentRepository.cancel.mockResolvedValueOnce(false);

      await expect(controller.cancel(userOf('student'), seat.id)).rejects.toMatchObject({
        statusCode: 409,
        message: 'enrolment.notApproved',
      });
    });

    it('answers 403 for an account that is not approved', async () => {
      const { controller } = setup();

      await expect(controller.cancel(userOf('student', 'pending'), CLASS_ID)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.status.notApproved',
      });
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

  describe('listPending', () => {
    it('answers the total and the classes for an admin', async () => {
      const { controller, enrolmentRepository } = setup();
      enrolmentRepository.findPendingByClass.mockResolvedValue([{ id: CLASS_ID, requests: [{}, {}] }]);

      expect(await controller.listPending(userOf('admin'))).toEqual({
        total: 2,
        classes: [{ id: CLASS_ID, requests: [{}, {}] }],
      });
      expect(enrolmentRepository.findPendingByClass).toHaveBeenCalledWith(NOW);
    });

    it('answers 403 for a student, an instructor and a pending account', async () => {
      const { controller } = setup();

      for (const role of ['student', 'instructor']) {
        await expect(controller.listPending(userOf(role))).rejects.toMatchObject({
          statusCode: 403,
          message: 'user.role.notAdmin',
        });
      }
      await expect(controller.listPending(userOf('admin', 'pending'))).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.status.notApproved',
      });
    });
  });

  describe('approve and deny', () => {
    async function pending() {
      const harness = setup();
      await harness.controller.request(userOf('student'), CLASS_ID, { acceptCancellationRule: true });
      return { ...harness, id: harness.stored[0]!.id };
    }

    it('approves a pending request and tells the student', async () => {
      const { controller, id, enrolmentRepository, notifier } = await pending();

      expect(await controller.approve(userOf('admin'), id)).toEqual({
        id,
        classId: CLASS_ID,
        status: 'approved',
        requestedAt: NOW,
      });
      expect(enrolmentRepository.approve).toHaveBeenCalledWith(id, NOW);
      expect(notifier.requestApproved).toHaveBeenCalledWith({
        studentId: STUDENT_ID,
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: STARTS_AT,
      });
    });

    it('answers 409 enrolment.class.full and enrolment.notPending from the locked write', async () => {
      const { controller, id, enrolmentRepository } = await pending();
      enrolmentRepository.approve.mockResolvedValueOnce('full').mockResolvedValueOnce('notPending');

      await expect(controller.approve(userOf('admin'), id)).rejects.toMatchObject({
        statusCode: 409,
        message: 'enrolment.class.full',
      });
      await expect(controller.approve(userOf('admin'), id)).rejects.toMatchObject({
        statusCode: 409,
        message: 'enrolment.notPending',
      });
    });

    it('denies with the reason and tells the student with it', async () => {
      const { controller, id, enrolmentRepository, notifier } = await pending();

      const out = await controller.deny(userOf('admin'), id, { reason: ' Nível avançado ' });

      expect(out).toEqual({ id, classId: CLASS_ID, status: 'denied', requestedAt: NOW });
      expect(enrolmentRepository.deny).toHaveBeenCalledWith(id, 'Nível avançado', NOW);
      expect(notifier.requestDenied).toHaveBeenCalledWith({
        studentId: STUDENT_ID,
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: STARTS_AT,
        reason: 'Nível avançado',
      });
    });

    it('denies without a body, storing no reason', async () => {
      const { controller, id, enrolmentRepository } = await pending();

      await controller.deny(userOf('admin'), id);

      expect(enrolmentRepository.deny).toHaveBeenCalledWith(id, null, NOW);
    });

    it('answers 422 for a reason over 500 characters and 404 for an unknown enrolment', async () => {
      const { controller, id } = await pending();

      await expect(controller.deny(userOf('admin'), id, { reason: 'a'.repeat(501) })).rejects.toMatchObject({
        statusCode: 422,
      });
      await expect(controller.approve(userOf('admin'), 'not-a-uuid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'enrolment.notFound',
      });
      await expect(controller.deny(userOf('admin'), INSTRUCTOR_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'enrolment.notFound',
      });
    });

    it('answers 403 for anyone but an approved admin', async () => {
      const { controller, id } = await pending();

      for (const role of ['student', 'instructor']) {
        await expect(controller.approve(userOf(role), id)).rejects.toMatchObject({ statusCode: 403 });
        await expect(controller.deny(userOf(role), id)).rejects.toMatchObject({ statusCode: 403 });
      }
      await expect(controller.approve(userOf('admin', 'pending'), id)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.status.notApproved',
      });
    });
  });

  describe('enrolDirectly', () => {
    const response = () => ({ status: vi.fn() });

    it('stores an approved enrolment, answers 201 and tells the student', async () => {
      const { controller, enrolmentRepository, notifier } = setup();
      const res = response();

      const out = await controller.enrolDirectly(userOf('admin', 'approved', INSTRUCTOR_ID), CLASS_ID, { studentId: STUDENT_ID }, res);

      expect(out).toEqual({ id: expect.any(String), classId: CLASS_ID, status: 'approved', requestedAt: NOW });
      expect(enrolmentRepository.enrolDirectly).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(notifier.studentEnrolled).toHaveBeenCalledWith({
        studentId: STUDENT_ID,
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: STARTS_AT,
      });
    });

    it('answers 200 and tells the student it was approved when a pending request was approved', async () => {
      const { controller, enrolmentRepository, notifier } = setup();
      const pending = new Enrolment({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
        status: 'approved',
        requestedAt: NOW,
      });
      enrolmentRepository.enrolDirectly.mockResolvedValue({ result: 'approved', enrolment: pending });
      const res = response();

      const out = await controller.enrolDirectly(userOf('admin'), CLASS_ID, { studentId: STUDENT_ID }, res);

      expect(out.id).toBe(pending.id);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(notifier.requestApproved).toHaveBeenCalledOnce();
      expect(notifier.studentEnrolled).not.toHaveBeenCalled();
    });

    it.each([
      ['alreadyApproved', 'enrolment.alreadyApproved'],
      ['full', 'enrolment.class.full'],
    ] as const)('answers 409 %s', async (result, message) => {
      const { controller, enrolmentRepository } = setup();
      enrolmentRepository.enrolDirectly.mockResolvedValue({ result } as never);

      await expect(
        controller.enrolDirectly(userOf('admin'), CLASS_ID, { studentId: STUDENT_ID }, response()),
      ).rejects.toMatchObject({ statusCode: 409, message });
    });

    it('answers 422 for a missing or unknown student, 404 for an unknown class and 403 for a non-admin', async () => {
      const { controller } = setup();

      await expect(controller.enrolDirectly(userOf('admin'), CLASS_ID, undefined, response())).rejects.toMatchObject({
        statusCode: 422,
        message: 'enrolment.student.invalid',
      });
      await expect(
        controller.enrolDirectly(userOf('admin'), INSTRUCTOR_ID, { studentId: STUDENT_ID }, response()),
      ).rejects.toMatchObject({ statusCode: 404, message: 'class.notFound' });
      await expect(
        controller.enrolDirectly(userOf('student'), CLASS_ID, { studentId: STUDENT_ID }, response()),
      ).rejects.toMatchObject({ statusCode: 403, message: 'user.role.notAdmin' });
    });
  });

  describe('takeOut', () => {
    async function approved() {
      const harness = setup();
      const seat = new Enrolment({
        classId: CLASS_ID,
        studentId: STUDENT_ID,
        status: 'approved',
        requestedAt: NOW,
      });
      harness.stored.push(seat);
      return { ...harness, id: seat.id };
    }

    it('takes the student out with the trimmed reason and tells them', async () => {
      const { controller, id, enrolmentRepository, notifier } = await approved();

      const out = await controller.takeOut(userOf('admin'), id, { reason: ' Turma avançada ' });

      expect(out).toEqual({ id, classId: CLASS_ID, status: 'takenOut', requestedAt: NOW });
      expect(enrolmentRepository.takeOut).toHaveBeenCalledWith(id, 'Turma avançada', NOW);
      expect(notifier.studentTakenOut).toHaveBeenCalledWith({
        studentId: STUDENT_ID,
        classId: CLASS_ID,
        discipline: 'surf',
        startsAt: STARTS_AT,
        reason: 'Turma avançada',
      });
    });

    it('takes out without a body, storing no reason', async () => {
      const { controller, id, enrolmentRepository } = await approved();

      await controller.takeOut(userOf('admin'), id);

      expect(enrolmentRepository.takeOut).toHaveBeenCalledWith(id, null, NOW);
    });

    it('answers 422 over 300 characters, 404 for an unknown enrolment and 403 for a non-admin', async () => {
      const { controller, id } = await approved();

      await expect(controller.takeOut(userOf('admin'), id, { reason: 'a'.repeat(301) })).rejects.toMatchObject({
        statusCode: 422,
      });
      await expect(controller.takeOut(userOf('admin'), 'not-a-uuid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'enrolment.notFound',
      });
      await expect(controller.takeOut(userOf('student'), id)).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
