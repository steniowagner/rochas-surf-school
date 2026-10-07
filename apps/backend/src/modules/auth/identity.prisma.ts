import { Injectable } from '@nestjs/common';
import {
  Identity,
  IdentityProvider,
  IdentityRepository,
} from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import type { Identity as IdentityRecord } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(identity: Identity): Promise<Identity> {
    const record = await this.prisma.identity.create({
      data: {
        id: identity.id,
        userId: identity.userId,
        provider: identity.provider,
        providerUserId: identity.providerUserId,
        email: identity.email ?? null,
        createdAt: identity.createdAt,
        deletedAt: identity.deletedAt ?? null,
      },
    });
    return this.toDomain(record);
  }

  async findByProvider(
    provider: IdentityProvider,
    providerUserId: string,
  ): Promise<Identity | null> {
    const record = await this.prisma.identity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
    return record ? this.toDomain(record) : null;
  }

  async findByUserId(userId: string): Promise<Identity[]> {
    const records = await this.prisma.identity.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.toDomain(record));
  }

  private toDomain(record: IdentityRecord): Identity {
    return new Identity({
      id: record.id,
      userId: record.userId,
      provider: record.provider,
      providerUserId: record.providerUserId,
      email: record.email ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
