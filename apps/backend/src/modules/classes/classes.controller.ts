import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import {
  ClassActor,
  CreateClassBatch,
  CreateClassBatchIn,
  CreateClassBatchOut,
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
import { PrismaClassViewReader } from './class-view-reader.prisma.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaTeacherLookup } from './teacher-lookup.prisma.js';

type CreateClassBatchBody = Partial<Omit<CreateClassBatchIn, 'actor'>> | undefined;

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
    return new ListWeekClasses(this.classViewReader).execute({ actor: actorOf(user), date });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  one(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<GetClassOut> {
    return new GetClass(this.classViewReader).execute({ actor: actorOf(user), id });
  }
}
