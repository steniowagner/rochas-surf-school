import { Injectable } from '@nestjs/common';
import { RefreshToken, RefreshTokenRepository } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import type { RefreshToken as RefreshTokenRecord } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(refreshToken: RefreshToken): Promise<RefreshToken> {
    const record = await this.prisma.refreshToken.create({
      data: {
        id: refreshToken.id,
        userId: refreshToken.userId,
        tokenHash: refreshToken.tokenHash,
        familyId: refreshToken.familyId,
        expiresAt: refreshToken.expiresAt,
        revokedAt: refreshToken.revokedAt ?? null,
        createdAt: refreshToken.createdAt,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: RefreshTokenRecord): RefreshToken {
    return new RefreshToken({
      id: record.id,
      userId: record.userId,
      tokenHash: record.tokenHash,
      familyId: record.familyId,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
