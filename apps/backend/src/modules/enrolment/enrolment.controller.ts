import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import type { ClassActor } from '@rochas-surf-school/classes';
import {
  type EnrolmentOut,
  RequestSeat,
  WithdrawRequest,
} from '@rochas-surf-school/enrolment';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import { SystemClockProvider } from './system.clock.js';

type RequestSeatBody = { acceptCancellationRule?: unknown } | undefined;

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller()
export class EnrolmentController {
  constructor(
    private readonly enrolmentRepository: PrismaEnrolmentRepository,
    private readonly classReader: PrismaEnrolmentClassReader,
    private readonly studentNameReader: PrismaStudentNameReader,
    private readonly enrolmentNotifier: NotificationsEnrolmentNotifier,
    private readonly clock: SystemClockProvider,
  ) {}

  @Post('classes/:id/enrolments')
  @HttpCode(HttpStatus.CREATED)
  request(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: RequestSeatBody,
  ): Promise<EnrolmentOut> {
    return new RequestSeat(
      this.enrolmentRepository,
      this.classReader,
      this.studentNameReader,
      this.enrolmentNotifier,
      this.clock,
    ).execute({
      actor: actorOf(user),
      classId: id,
      acceptCancellationRule: body?.acceptCancellationRule,
    });
  }

  @Post('enrolments/:id/withdraw')
  @HttpCode(HttpStatus.OK)
  withdraw(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<EnrolmentOut> {
    return new WithdrawRequest(this.enrolmentRepository, this.classReader, this.clock).execute({
      actor: actorOf(user),
      id,
    });
  }
}
