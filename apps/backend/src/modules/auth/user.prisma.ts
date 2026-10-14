import { Injectable } from '@nestjs/common';
import { PageResult } from '@rochas-surf-school/shared';
import {
  DirectoryPageParams,
  RulesAcceptance,
  User,
  UserPageParams,
  UserRepository,
} from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import type {
  User as UserRecord,
  UserRulesAcceptance as UserRulesAcceptanceRecord,
} from '../../generated/prisma/client.js';

type UserRecordWithAcceptances = UserRecord & {
  rulesAcceptances: UserRulesAcceptanceRecord[];
};

const include = { rulesAcceptances: true } as const;

/** Escapes `\`, `%` and `_` so a search is matched literally by LIKE. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

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

  async findDirectoryPage(params: DirectoryPageParams): Promise<PageResult<User>> {
    const conditions = [Prisma.sql`status = 'approved'`];
    if (params.roles?.length) {
      conditions.push(Prisma.sql`role = ANY(${params.roles}::user_role[])`);
    }
    if (params.search) {
      const pattern = `%${escapeLike(params.search)}%`;
      conditions.push(Prisma.sql`unaccent(lower(name)) LIKE unaccent(lower(${pattern}))`);
    }
    const where = Prisma.join(conditions, ' AND ');
    const orderBy = Prisma.sql`lower(unaccent(name)) ASC, id ASC`;

    const [rows, counts] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM users WHERE ${where} ORDER BY ${orderBy}
        LIMIT ${params.perPage} OFFSET ${(params.page - 1) * params.perPage}`,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total FROM users WHERE ${where}`,
    ]);

    const ids = rows.map((row) => row.id);
    const records =
      ids.length === 0
        ? []
        : await this.prisma.user.findMany({ where: { id: { in: ids } }, include });
    const byId = new Map(records.map((record) => [record.id, record]));

    return {
      items: ids.map((id) => this.toDomain(byId.get(id)!)),
      page: params.page,
      perPage: params.perPage,
      total: Number(counts[0].total),
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

  async findPending(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include,
    });
    return records.map((record) => this.toDomain(record));
  }

  async updateIfPending(user: User): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, status: 'pending' },
      data: this.toData(user),
    });
    return count === 1;
  }

  async findDeniedBefore(cutoff: Date): Promise<string[]> {
    const records = await this.prisma.user.findMany({
      where: { status: 'denied', deniedAt: { lte: cutoff } },
      select: { id: true },
    });
    return records.map((record) => record.id);
  }

  async deleteDenied(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const { count } = await this.prisma.user.deleteMany({
      where: { id: { in: ids }, status: 'denied' },
    });
    return count;
  }

  async addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void> {
    await this.prisma.userRulesAcceptance.createMany({
      data: [
        { userId, version: acceptance.version, acceptedAt: acceptance.acceptedAt },
      ],
      skipDuplicates: true,
    });
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
      reactivationRequestedAt: user.reactivationRequestedAt ?? null,
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
      reactivationRequestedAt: record.reactivationRequestedAt ?? undefined,
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
