import { Injectable } from '@nestjs/common';
import { SignInCode, SignInCodeRepository } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import type { SignInCode as SignInCodeRecord } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaSignInCodeRepository implements SignInCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<SignInCode | null> {
    const record = await this.prisma.signInCode.findUnique({ where: { email } });
    return record ? this.toDomain(record) : null;
  }

  async save(signInCode: SignInCode): Promise<SignInCode> {
    const values = {
      codeHash: signInCode.codeHash,
      expiresAt: signInCode.expiresAt,
      lastSentAt: signInCode.lastSentAt,
      attempts: signInCode.attempts,
    };
    const record = await this.prisma.signInCode.upsert({
      where: { email: signInCode.email },
      create: { id: signInCode.id, email: signInCode.email, ...values },
      update: values,
    });
    return this.toDomain(record);
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.prisma.signInCode.deleteMany({ where: { email } });
  }

  async incrementAttempts(email: string): Promise<void> {
    await this.prisma.signInCode.updateMany({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
  }

  async consume(email: string, codeHash: string): Promise<boolean> {
    const { count } = await this.prisma.signInCode.deleteMany({
      where: { email, codeHash },
    });
    return count === 1;
  }

  async deleteExpired(now: Date): Promise<number> {
    const { count } = await this.prisma.signInCode.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return count;
  }

  private toDomain(record: SignInCodeRecord): SignInCode {
    return new SignInCode({
      id: record.id,
      email: record.email,
      codeHash: record.codeHash,
      expiresAt: record.expiresAt,
      lastSentAt: record.lastSentAt,
      attempts: record.attempts,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
