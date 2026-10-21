import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { ClassActor } from '@rochas-surf-school/classes';
import { AddGuest, type AddGuestOut, RemoveGuest } from '@rochas-surf-school/enrolment';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { PrismaGuestRepository } from './guest.prisma.js';
import { SystemClockProvider } from './system.clock.js';

type AddGuestBody = { name?: unknown; whatsappNumber?: unknown } | undefined;

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

/** Trial guests: admins add them to a class and take them out; nobody is told. */
@Controller()
export class GuestsController {
  constructor(
    private readonly guestRepository: PrismaGuestRepository,
    private readonly classReader: PrismaEnrolmentClassReader,
    private readonly clock: SystemClockProvider,
  ) {}

  @Post('classes/:id/guests')
  @HttpCode(HttpStatus.CREATED)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: AddGuestBody,
  ): Promise<AddGuestOut> {
    return new AddGuest(this.guestRepository, this.classReader, this.clock).execute({
      actor: actorOf(user),
      classId: id,
      name: body?.name,
      whatsappNumber: body?.whatsappNumber,
    });
  }

  @Delete('guests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return new RemoveGuest(this.guestRepository, this.classReader, this.clock).execute({
      actor: actorOf(user),
      id,
    });
  }
}
