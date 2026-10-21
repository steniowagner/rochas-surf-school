import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { EnrolmentController } from './enrolment.controller.js';
import { EnrolmentSeatReleaser } from './enrolment.seat-releaser.js';
import { EnrolmentExpiryJob } from './enrolment-expiry.job.js';
import { GuestErasureJob } from './guest-erasure.job.js';
import { GuestsController } from './guests.controller.js';
import { PrismaGuestRepository } from './guest.prisma.js';
import { PrismaClassAudienceReader } from './class-audience-reader.prisma.js';
import { PrismaClassRosterReader } from './class-roster-reader.prisma.js';
import { EnrolmentClassEnrolmentsCloser } from './enrolment.class-enrolments-closer.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { PrismaMyClassesReader } from './my-classes-reader.prisma.js';
import { PrismaPendingRequestCounter } from './pending-request-counter.prisma.js';
import { PrismaSeatCounter } from './seat-counter.prisma.js';
import { PrismaStudentLookup } from './student-lookup.prisma.js';
import { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaViewerEnrolmentReader } from './viewer-enrolment-reader.prisma.js';
import { PrismaWaitingListSetting } from './waiting-list-setting.prisma.js';

@Module({
  imports: [NotificationsModule],
  controllers: [EnrolmentController, GuestsController],
  providers: [
    EnrolmentClassEnrolmentsCloser,
    EnrolmentExpiryJob,
    EnrolmentSeatReleaser,
    GuestErasureJob,
    PrismaClassAudienceReader,
    PrismaClassRosterReader,
    PrismaEnrolmentClassReader,
    PrismaEnrolmentRepository,
    PrismaGuestRepository,
    PrismaMyClassesReader,
    PrismaPendingRequestCounter,
    PrismaSeatCounter,
    PrismaStudentLookup,
    PrismaStudentNameReader,
    PrismaViewerEnrolmentReader,
    PrismaWaitingListSetting,
    SystemClockProvider,
  ],
  exports: [
    EnrolmentClassEnrolmentsCloser,
    EnrolmentSeatReleaser,
    PrismaClassAudienceReader,
    PrismaClassRosterReader,
    PrismaEnrolmentClassReader,
    PrismaEnrolmentRepository,
    PrismaMyClassesReader,
    PrismaPendingRequestCounter,
    PrismaSeatCounter,
    PrismaStudentLookup,
    PrismaStudentNameReader,
    PrismaViewerEnrolmentReader,
    SystemClockProvider,
  ],
})
export class EnrolmentModule {}
