import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthModule } from './shared/auth/jwt-auth.module.js';
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard.js';
import { ApiExceptionFilter } from './shared/errors/api-exception.filter.js';
import { SchoolRulesModule } from './modules/school-rules/school-rules.module.js';
import { SchoolSettingsModule } from './modules/school-settings/school-settings.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ClassesModule } from './modules/classes/classes.module.js';
import { EnrolmentModule } from './modules/enrolment/enrolment.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DbModule,
    JwtAuthModule,
    AuthModule,
    SchoolRulesModule,
    SchoolSettingsModule,
    NotificationsModule,
    ClassesModule,
    EnrolmentModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
