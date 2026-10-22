import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { EnrolmentModule } from '../enrolment/enrolment.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AnthropicDeadlineDescriber } from './anthropic.deadline-describer.js';
import { PrismaCancellationRuleRepository } from './cancellation-rule.prisma.js';
import { PrismaClassContactReader } from './class-contact-reader.prisma.js';
import { PrismaClassViewReader } from './class-view-reader.prisma.js';
import { CancellationDeadlineJob } from './cancellation-deadline.job.js';
import { CancellationRulesController } from './cancellation-rules.controller.js';
import { ClassesController } from './classes.controller.js';
import { ClassesTeachingReleaser } from './classes.teaching-releaser.js';
import { GooglePlacesAddressSuggestionProvider } from './google-places.address-suggestions.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { LocationsController } from './locations.controller.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaTeacherLookup } from './teacher-lookup.prisma.js';

@Module({
  imports: [DbModule, EnrolmentModule, NotificationsModule],
  controllers: [CancellationRulesController, ClassesController, LocationsController],
  providers: [
    AnthropicDeadlineDescriber,
    CancellationDeadlineJob,
    ClassesTeachingReleaser,
    GooglePlacesAddressSuggestionProvider,
    PrismaCancellationRuleRepository,
    PrismaClassContactReader,
    PrismaClassViewReader,
    PrismaLocationRepository,
    PrismaSchoolClassRepository,
    PrismaTeacherLookup,
    SystemClockProvider,
  ],
  exports: [ClassesTeachingReleaser],
})
export class ClassesModule {}
