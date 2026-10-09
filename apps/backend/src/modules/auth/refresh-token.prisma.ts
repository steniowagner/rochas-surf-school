import { Injectable } from '@nestjs/common';
import { RefreshToken, RefreshTokenRepository } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import type { RefreshToken as RefreshTokenRecord } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(refreshToken: RefreshToken): Promise<RefreshToken> {
    const record = await this.prisma.refreshToken.create({
      data: this.toData(refreshToken),
    });
    return this.toDomain(record);
  }

  async findByTokenHash(hash: string): Promise<RefreshToken | null> {
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    return record ? this.toDomain(record) : null;
  }

  async revokeIfActive(id: string, at: Date): Promise<boolean> {
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: at },
    });
    return count === 1;
  }

  async rotate(currentId: string, next: RefreshToken, at: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: at },
      });
      if (count !== 1) return false;

      await tx.refreshToken.create({ data: this.toData(next) });
      return true;
    });
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  private toData(refreshToken: RefreshToken) {
    return {
      id: refreshToken.id,
      userId: refreshToken.userId,
      tokenHash: refreshToken.tokenHash,
      familyId: refreshToken.familyId,
      expiresAt: refreshToken.expiresAt,
      revokedAt: refreshToken.revokedAt ?? null,
      createdAt: refreshToken.createdAt,
    };
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
