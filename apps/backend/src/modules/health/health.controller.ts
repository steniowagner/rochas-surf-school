import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service.js';
import { Public } from '../../shared/decorators/public.decorator.js';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('health.database.unreachable');
    }
    return { status: 'ok' };
  }
}
