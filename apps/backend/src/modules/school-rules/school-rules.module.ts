import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { SchoolRulesController } from './school-rules.controller.js';
import { PrismaSchoolRuleRepository } from './school-rule.prisma.js';

@Module({
  imports: [DbModule],
  controllers: [SchoolRulesController],
  providers: [PrismaSchoolRuleRepository],
})
export class SchoolRulesModule {}
