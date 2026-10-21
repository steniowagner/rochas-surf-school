import { HttpStatus, RequestMethod } from '@nestjs/common';
import { HTTP_CODE_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { Guest } from '@rochas-surf-school/enrolment';
import { IS_PUBLIC_KEY } from '../../shared/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import type { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { GuestsController } from './guests.controller.js';
import type { PrismaGuestRepository } from './guest.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const ADMIN_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const CLASS_ID = '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const NOW = new Date('2026-10-18T12:00:00.000Z');
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');
const BODY = { name: 'Carolina Reis', whatsappNumber: '+5585999990000' };

function userOf(role: string, status = 'approved'): AuthenticatedUser {
  return { id: ADMIN_ID, email: 'a@example.com', role, status, claims: {} } as unknown as AuthenticatedUser;
}

function handlerOf(name: keyof GuestsController): object {
  return Object.getOwnPropertyDescriptor(GuestsController.prototype, name)!.value as object;
}

function setup() {
  const stored: Guest[] = [];
  const guestRepository = {
    create: vi.fn(async (guest: Guest) => {
      stored.push(guest);
      return 'added';
    }),
    findById: vi.fn(async (id: string) => stored.find((item) => item.id === id) ?? null),
    delete: vi.fn(async () => true),
  };
  const classReader = {
    findById: vi.fn(async (id: string) =>
      id === CLASS_ID ? { id: CLASS_ID, startsAt: STARTS_AT, cancelledAt: null } : null,
    ),
  };
  const controller = new GuestsController(
    guestRepository as unknown as PrismaGuestRepository,
    classReader as unknown as PrismaEnrolmentClassReader,
    { now: () => NOW } as SystemClockProvider,
  );

  return { controller, guestRepository, stored };
}

describe('GuestsController', () => {
  it.each([
    ['add', 'classes/:id/guests', RequestMethod.POST, HttpStatus.CREATED],
    ['remove', 'guests/:id', RequestMethod.DELETE, HttpStatus.NO_CONTENT],
  ] as const)('%s is a protected %s route answering %s', (name, path, method, status) => {
    const handler = handlerOf(name);

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(method);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(status);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
  });

  describe('add', () => {
    it('stores the guest as the admin and answers its id, class and name', async () => {
      const { controller, stored } = setup();

      const out = await controller.add(userOf('admin'), CLASS_ID, BODY);

      expect(out).toEqual({ id: stored[0].id, classId: CLASS_ID, name: 'Carolina Reis' });
      expect(stored[0].createdBy).toBe(ADMIN_ID);
      expect(stored[0].whatsappNumber).toBe('+5585999990000');
    });

    it('answers 422 for a missing body, reporting the name and the number', async () => {
      const { controller, stored } = setup();

      await expect(controller.add(userOf('admin'), CLASS_ID)).rejects.toMatchObject({
        statusCode: 422,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: 'guest.name.required' }),
          expect.objectContaining({ message: 'guest.whatsappNumber.invalid' }),
        ]),
      });
      expect(stored).toEqual([]);
    });

    it('answers 403 for a pending admin and for other roles', async () => {
      const { controller } = setup();

      await expect(controller.add(userOf('admin', 'pending'), CLASS_ID, BODY)).rejects.toMatchObject({
        statusCode: 403,
        message: 'user.status.notApproved',
      });
      for (const role of ['student', 'instructor']) {
        await expect(controller.add(userOf(role), CLASS_ID, BODY)).rejects.toMatchObject({
          statusCode: 403,
          message: 'user.role.notAdmin',
        });
      }
    });

    it('answers 404 class.notFound for an unknown class', async () => {
      const { controller } = setup();

      await expect(controller.add(userOf('admin'), ADMIN_ID, BODY)).rejects.toMatchObject({
        statusCode: 404,
        message: 'class.notFound',
      });
    });
  });

  describe('remove', () => {
    it('deletes the guest and answers nothing', async () => {
      const { controller, guestRepository, stored } = setup();
      const { id } = await controller.add(userOf('admin'), CLASS_ID, BODY);

      await expect(controller.remove(userOf('admin'), id)).resolves.toBeUndefined();
      expect(guestRepository.delete).toHaveBeenCalledWith(stored[0].id);
    });

    it('answers 404 guest.notFound, and 403 to a non-admin', async () => {
      const { controller } = setup();

      await expect(controller.remove(userOf('admin'), 'not-a-uuid')).rejects.toMatchObject({
        statusCode: 404,
        message: 'guest.notFound',
      });
      await expect(controller.remove(userOf('student'), ADMIN_ID)).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});
