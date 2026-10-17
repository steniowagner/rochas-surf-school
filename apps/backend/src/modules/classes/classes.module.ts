import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PrismaClassViewReader } from './class-view-reader.prisma.js';
import { ClassesController } from './classes.controller.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { NoEnrolmentSeatCounter } from './no-enrolment.seat-counter.js';
import { LocationsController } from './locations.controller.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaTeacherLookup } from './teacher-lookup.prisma.js';

@Module({
  imports: [DbModule, NotificationsModule],
  controllers: [ClassesController, LocationsController],
  providers: [
    NoEnrolmentSeatCounter,
    PrismaClassViewReader,
    PrismaLocationRepository,
    PrismaSchoolClassRepository,
    PrismaTeacherLookup,
    SystemClockProvider,
  ],
})
export class ClassesModule {}
