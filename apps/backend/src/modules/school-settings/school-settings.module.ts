import { Module } from '@nestjs/common';
import { SchoolSettingsController } from './school-settings.controller.js';

@Module({
  controllers: [SchoolSettingsController],
})
export class SchoolSettingsModule {}
