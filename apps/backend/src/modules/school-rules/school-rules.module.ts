import { Module } from '@nestjs/common';
import { SchoolRulesController } from './school-rules.controller.js';

@Module({
  controllers: [SchoolRulesController],
})
export class SchoolRulesModule {}
