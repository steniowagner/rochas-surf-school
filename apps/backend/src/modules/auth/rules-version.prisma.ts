import { Injectable } from '@nestjs/common';
import { RulesVersionProvider } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';

@Injectable()
export class PrismaRulesVersionProvider implements RulesVersionProvider {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentVersion(): Promise<number> {
    const { version } = await this.prisma.rulesVersion.findFirstOrThrow();
    return version;
  }
}
