import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EnrolmentController } from './enrolment.controller.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import { SystemClockProvider } from './system.clock.js';

@Module({
  imports: [NotificationsModule],
  controllers: [EnrolmentController],
  providers: [
    PrismaEnrolmentClassReader,
    PrismaEnrolmentRepository,
    PrismaStudentNameReader,
    SystemClockProvider,
  ],
  exports: [
    PrismaEnrolmentClassReader,
    PrismaEnrolmentRepository,
    PrismaStudentNameReader,
    SystemClockProvider,
  ],
})
export class EnrolmentModule {}
