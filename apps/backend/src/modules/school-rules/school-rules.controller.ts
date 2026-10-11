import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  CreateSchoolRule,
  CreateSchoolRuleIn,
  DeleteSchoolRule,
  ListSchoolRules,
  ReorderSchoolRules,
  ReorderSchoolRulesIn,
  SchoolRuleActor,
  SchoolRulesOut,
  UpdateSchoolRule,
} from '@rochas-surf-school/school-rules';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaSchoolRuleRepository } from './school-rule.prisma.js';

type RuleTextBody = Partial<Pick<CreateSchoolRuleIn, 'title' | 'description'>> | undefined;

function actorOf(user: AuthenticatedUser): SchoolRuleActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('school-rules')
export class SchoolRulesController {
  constructor(private readonly schoolRuleRepository: PrismaSchoolRuleRepository) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthenticatedUser): Promise<SchoolRulesOut> {
    return new ListSchoolRules(this.schoolRuleRepository).execute({ actor: actorOf(user) });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RuleTextBody,
  ): Promise<SchoolRulesOut> {
    return new CreateSchoolRule(this.schoolRuleRepository).execute({
      actor: actorOf(user),
      title: body?.title as string,
      description: body?.description as string,
    });
  }

  // Declared before ':id' so that "order" is not read as a rule id.
  @Put('order')
  @HttpCode(HttpStatus.OK)
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<Pick<ReorderSchoolRulesIn, 'ruleIds'>> | undefined,
  ): Promise<SchoolRulesOut> {
    return new ReorderSchoolRules(this.schoolRuleRepository).execute({
      actor: actorOf(user),
      ruleIds: body?.ruleIds as string[],
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: RuleTextBody,
  ): Promise<SchoolRulesOut> {
    return new UpdateSchoolRule(this.schoolRuleRepository).execute({
      actor: actorOf(user),
      ruleId: id,
      title: body?.title as string,
      description: body?.description as string,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<SchoolRulesOut> {
    return new DeleteSchoolRule(this.schoolRuleRepository).execute({
      actor: actorOf(user),
      ruleId: id,
    });
  }
}
