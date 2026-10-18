import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import {
  CancellationRulesOut,
  ClassActor,
  ListCancellationRules,
  SaveCancellationRule,
} from '@rochas-surf-school/classes';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaCancellationRuleRepository } from './cancellation-rule.prisma.js';
import { SystemClockProvider } from './system.clock.js';

type SaveRuleBody = { text?: unknown } | undefined;

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('cancellation-rules')
export class CancellationRulesController {
  constructor(
    private readonly cancellationRuleRepository: PrismaCancellationRuleRepository,
    private readonly clock: SystemClockProvider,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthenticatedUser): Promise<CancellationRulesOut> {
    return new ListCancellationRules(this.cancellationRuleRepository).execute({
      actor: actorOf(user),
    });
  }

  @Put(':discipline')
  @HttpCode(HttpStatus.OK)
  save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('discipline') discipline: string,
    @Body() body?: SaveRuleBody,
  ): Promise<CancellationRulesOut> {
    return new SaveCancellationRule(this.cancellationRuleRepository, this.clock).execute({
      actor: actorOf(user),
      discipline,
      text: body?.text,
    });
  }
}
