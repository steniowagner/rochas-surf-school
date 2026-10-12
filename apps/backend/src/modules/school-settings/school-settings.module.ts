import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { SchoolSettingsController } from './school-settings.controller.js';
import { PrismaSchoolSettingsRepository } from './school-settings.prisma.js';

@Module({
  imports: [DbModule],
  controllers: [SchoolSettingsController],
  providers: [PrismaSchoolSettingsRepository],
})
export class SchoolSettingsModule {}
