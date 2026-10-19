import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CancelClass,
  ClassActor,
  CreateClassBatch,
  CreateClassBatchIn,
  CreateClassBatchOut,
  DeleteClass,
  EditClass,
  EditClassIn,
  GetClass,
  GetClassOut,
  ListWeekClasses,
  ListWeekClassesOut,
  ListTimeRangeSuggestions,
  ListTimeRangeSuggestionsOut,
} from '@rochas-surf-school/classes';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsClassAssignmentNotifier } from '../notifications/notifications.class-assignment-notifier.js';
import { NotificationsClassChangeNotifier } from '../notifications/notifications.class-change-notifier.js';
import { PrismaClassViewReader } from './class-view-reader.prisma.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { NoEnrolmentPendingRequestCounter } from './no-enrolment.pending-request-counter.js';
import { NoEnrolmentClassRosterReader } from './no-enrolment.class-roster.reader.js';
import { NoEnrolmentSeatCounter } from './no-enrolment.seat-counter.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaTeacherLookup } from './teacher-lookup.prisma.js';

type CreateClassBatchBody = Partial<Omit<CreateClassBatchIn, 'actor'>> | undefined;
type EditClassBody = Partial<Omit<EditClassIn, 'actor' | 'id'>> | undefined;
type CancelClassBody = { message?: unknown } | undefined;

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('classes')
export class ClassesController {
  constructor(
    private readonly schoolClassRepository: PrismaSchoolClassRepository,
    private readonly locationRepository: PrismaLocationRepository,
    private readonly teacherLookup: PrismaTeacherLookup,
    private readonly classAssignmentNotifier: NotificationsClassAssignmentNotifier,
    private readonly clock: SystemClockProvider,
    private readonly classViewReader: PrismaClassViewReader,
    private readonly classChangeNotifier: NotificationsClassChangeNotifier,
    private readonly seatCounter: NoEnrolmentSeatCounter,
    private readonly pendingRequestCounter: NoEnrolmentPendingRequestCounter,
    private readonly classRosterReader: NoEnrolmentClassRosterReader,
  ) {}

  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  createBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: CreateClassBatchBody,
  ): Promise<CreateClassBatchOut> {
    return new CreateClassBatch(
      this.schoolClassRepository,
      this.locationRepository,
      this.teacherLookup,
      this.classAssignmentNotifier,
      this.clock,
    ).execute({
      actor: actorOf(user),
      discipline: body?.discipline,
      level: body?.level,
      startDate: body?.startDate,
      endDate: body?.endDate,
      weekdays: body?.weekdays,
      excludedDates: body?.excludedDates,
      skipPast: body?.skipPast,
      timeRanges: body?.timeRanges,
      locationId: body?.locationId,
      instructorIds: body?.instructorIds,
      capacity: body?.capacity,
      notes: body?.notes,
    });
  }

  @Get('time-range-suggestions')
  @HttpCode(HttpStatus.OK)
  timeRangeSuggestions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListTimeRangeSuggestionsOut> {
    return new ListTimeRangeSuggestions(this.schoolClassRepository, this.clock).execute({
      actor: actorOf(user),
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  week(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: unknown,
  ): Promise<ListWeekClassesOut> {
    return new ListWeekClasses(this.classViewReader, this.classRosterReader).execute({ actor: actorOf(user), date });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  one(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<GetClassOut> {
    return new GetClass(this.classViewReader, this.classRosterReader).execute({ actor: actorOf(user), id });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: EditClassBody,
  ): Promise<GetClassOut> {
    const actor = actorOf(user);

    await new EditClass(
      this.schoolClassRepository,
      this.locationRepository,
      this.teacherLookup,
      this.classAssignmentNotifier,
      this.classChangeNotifier,
      this.seatCounter,
      this.clock,
    ).execute({
      actor,
      id,
      discipline: body?.discipline,
      level: body?.level,
      date: body?.date,
      start: body?.start,
      end: body?.end,
      locationId: body?.locationId,
      instructorIds: body?.instructorIds,
      capacity: body?.capacity,
      notes: body?.notes,
    });

    return new GetClass(this.classViewReader, this.classRosterReader).execute({ actor, id });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: CancelClassBody,
  ): Promise<GetClassOut> {
    const actor = actorOf(user);

    await new CancelClass(this.schoolClassRepository, this.classChangeNotifier, this.clock).execute({
      actor,
      id,
      message: body?.message,
    });

    return new GetClass(this.classViewReader, this.classRosterReader).execute({ actor, id });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    await new DeleteClass(
      this.schoolClassRepository,
      this.seatCounter,
      this.pendingRequestCounter,
      this.classChangeNotifier,
      this.clock,
    ).execute({ actor: actorOf(user), id });
  }
}
