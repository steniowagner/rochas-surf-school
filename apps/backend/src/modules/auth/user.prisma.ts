import { Injectable } from '@nestjs/common';
import { PageResult } from '@rochas-surf-school/shared';
import { User, UserPageParams, UserRepository } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import type {
  User as UserRecord,
  UserRulesAcceptance as UserRulesAcceptanceRecord,
} from '../../generated/prisma/client.js';

type UserRecordWithAcceptances = UserRecord & {
  rulesAcceptances: UserRulesAcceptanceRecord[];
};

const include = { rulesAcceptances: true } as const;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        ...this.toData(user),
        id: user.id,
        createdAt: user.createdAt,
        rulesAcceptances: { create: this.toAcceptances(user) },
      },
      include,
    });
    return this.toDomain(record);
  }

  async update(user: User): Promise<User> {
    const record = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...this.toData(user),
        rulesAcceptances: { deleteMany: {}, create: this.toAcceptances(user) },
      },
      include,
    });
    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id }, include });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email }, include });
    return record ? this.toDomain(record) : null;
  }

  async findPage(params: UserPageParams): Promise<PageResult<User>> {
    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { createdAt: 'asc' },
        include,
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: records.map((record) => this.toDomain(record)),
      page: params.page,
      perPage: params.perPage,
      total,
    };
  }

  async searchByName(name: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { name: { contains: name.trim(), mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      include,
    });
    return records.map((record) => this.toDomain(record));
  }

  private toData(user: User) {
    return {
      name: user.name,
      email: user.email,
      photoUrl: user.photoUrl ?? null,
      whatsappNumber: user.whatsappNumber ?? null,
      whatsappVisible: user.whatsappVisible,
      role: user.role,
      status: user.status,
      denialReason: user.denialReason ?? null,
      deniedAt: user.deniedAt ?? null,
      removedAt: user.removedAt ?? null,
      reactivationStatus: user.reactivationStatus ?? null,
      deletedAt: user.deletedAt ?? null,
    };
  }

  private toAcceptances(user: User) {
    return user.rulesAcceptances.map((item) => ({
      version: item.version,
      acceptedAt: item.acceptedAt,
    }));
  }

  private toDomain(record: UserRecordWithAcceptances): User {
    return new User({
      id: record.id,
      name: record.name,
      email: record.email,
      photoUrl: record.photoUrl ?? undefined,
      whatsappNumber: record.whatsappNumber ?? undefined,
      whatsappVisible: record.whatsappVisible,
      role: record.role,
      status: record.status,
      denialReason: record.denialReason ?? undefined,
      deniedAt: record.deniedAt ?? undefined,
      removedAt: record.removedAt ?? undefined,
      reactivationStatus: record.reactivationStatus ?? undefined,
      rulesAcceptances: record.rulesAcceptances.map((item) => ({
        version: item.version,
        acceptedAt: item.acceptedAt,
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deletedAt: record.deletedAt,
    });
  }
}
