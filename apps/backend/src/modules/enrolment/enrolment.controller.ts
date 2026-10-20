import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Res } from '@nestjs/common';
import type { ClassActor } from '@rochas-surf-school/classes';
import {
  ApproveRequest,
  CancelSeat,
  DenyRequest,
  EnrolStudent,
  type EnrolmentOut,
  ListPendingRequests,
  type ListPendingRequestsOut,
  RequestSeat,
  TakeStudentOut,
  WithdrawRequest,
} from '@rochas-surf-school/enrolment';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { PrismaStudentLookup } from './student-lookup.prisma.js';
import { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import { SystemClockProvider } from './system.clock.js';

type RequestSeatBody = { acceptCancellationRule?: unknown } | undefined;
type DenyRequestBody = { reason?: unknown } | undefined;
type EnrolStudentBody = { studentId?: unknown } | undefined;
type TakeOutBody = { reason?: unknown } | undefined;

/** What the controller needs of the response: the status of a pending request approved by the enrolment. */
interface StatusResponse {
  status(code: number): unknown;
}

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller()
export class EnrolmentController {
  constructor(
    private readonly enrolmentRepository: PrismaEnrolmentRepository,
    private readonly classReader: PrismaEnrolmentClassReader,
    private readonly studentNameReader: PrismaStudentNameReader,
    private readonly studentLookup: PrismaStudentLookup,
    private readonly enrolmentNotifier: NotificationsEnrolmentNotifier,
    private readonly clock: SystemClockProvider,
  ) {}

  // Declared before the `:id` routes so the static path is never read as an id.
  @Get('enrolments/pending')
  listPending(@CurrentUser() user: AuthenticatedUser): Promise<ListPendingRequestsOut> {
    return new ListPendingRequests(this.enrolmentRepository, this.clock).execute({
      actor: actorOf(user),
    });
  }

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

  @Post('enrolments/:id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<EnrolmentOut> {
    return new CancelSeat(
      this.enrolmentRepository,
      this.classReader,
      this.studentNameReader,
      this.enrolmentNotifier,
      this.clock,
    ).execute({ actor: actorOf(user), id });
  }

  @Post('enrolments/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<EnrolmentOut> {
    return new ApproveRequest(
      this.enrolmentRepository,
      this.classReader,
      this.enrolmentNotifier,
      this.clock,
    ).execute({ actor: actorOf(user), id });
  }

  @Post('enrolments/:id/deny')
  @HttpCode(HttpStatus.OK)
  deny(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: DenyRequestBody,
  ): Promise<EnrolmentOut> {
    return new DenyRequest(
      this.enrolmentRepository,
      this.classReader,
      this.enrolmentNotifier,
      this.clock,
    ).execute({ actor: actorOf(user), id, reason: body?.reason });
  }

  @Post('classes/:id/enrolments/direct')
  @HttpCode(HttpStatus.CREATED)
  async enrolDirectly(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: EnrolStudentBody,
    @Res({ passthrough: true }) response: StatusResponse,
  ): Promise<EnrolmentOut> {
    const { enrolment, created } = await new EnrolStudent(
      this.enrolmentRepository,
      this.classReader,
      this.studentLookup,
      this.enrolmentNotifier,
      this.clock,
    ).execute({ actor: actorOf(user), classId: id, studentId: body?.studentId });

    // A pending request that was approved is not a new resource.
    if (!created) {
      response.status(HttpStatus.OK);
    }

    return enrolment;
  }

  @Post('enrolments/:id/take-out')
  @HttpCode(HttpStatus.OK)
  takeOut(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: TakeOutBody,
  ): Promise<EnrolmentOut> {
    return new TakeStudentOut(
      this.enrolmentRepository,
      this.classReader,
      this.enrolmentNotifier,
      this.clock,
    ).execute({ actor: actorOf(user), id, reason: body?.reason });
  }
}
