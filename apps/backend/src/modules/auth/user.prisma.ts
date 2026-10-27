import { Injectable } from '@nestjs/common';
import { PageResult } from '@rochas-surf-school/shared';
import {
  DirectoryPageParams,
  ExpectedUserState,
  KeepAdminResult,
  RulesAcceptance,
  User,
  UserPageParams,
  UserRepository,
  UserStatus,
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

/** An erased account (spec 067) is never returned: for the auth module it no longer exists. */
const notErased = { not: 'erased' } as const;

/** The `deleted` accounts deleted, and the `removed` accounts removed, at or before `cutoff`; never one without the date. */
function closedBefore(cutoff: Date) {
  return {
    OR: [
      { status: 'deleted' as const, deletedAt: { lte: cutoff } },
      { status: 'removed' as const, removedAt: { lte: cutoff } },
    ],
  };
}

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
    const record = await this.prisma.user.findUnique({ where: { id, status: notErased }, include });
    return record ? this.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email, status: notErased },
      include,
    });
    return record ? this.toDomain(record) : null;
  }

  async findPage(params: UserPageParams): Promise<PageResult<User>> {
    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { status: notErased },
        skip: (params.page - 1) * params.perPage,
        take: params.perPage,
        orderBy: { createdAt: 'asc' },
        include,
      }),
      this.prisma.user.count({ where: { status: notErased } }),
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
      where: { name: { contains: name.trim(), mode: 'insensitive' }, status: notErased },
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

  async findReactivationRequests(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { status: 'deleted', reactivationStatus: 'requested' },
      orderBy: [{ reactivationRequestedAt: 'asc' }, { id: 'asc' }],
      include,
    });
    return records.map((record) => this.toDomain(record));
  }

  async updateIfReactivationRequested(user: User): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, status: 'deleted', reactivationStatus: 'requested' },
      data: this.toData(user),
    });
    return count === 1;
  }

  async findRemovedSince(cutoff: Date): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { status: 'removed', removedAt: { not: null, gt: cutoff } },
      orderBy: [{ removedAt: 'desc' }, { id: 'asc' }],
      include,
    });
    return records.map((record) => this.toDomain(record));
  }

  async updateIfRemoved(user: User): Promise<boolean> {
    const { count } = await this.prisma.user.updateMany({
      where: { id: user.id, status: 'removed' },
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

  async findClosedBefore(cutoff: Date): Promise<string[]> {
    const records = await this.prisma.user.findMany({
      where: closedBefore(cutoff),
      select: { id: true },
    });
    return records.map((record) => record.id);
  }

  /**
   * One transaction: reads the old emails of the accounts still due, writes the anonymous record only where the
   * account is still due (so one reactivated or restored meanwhile is left alone), then deletes what hangs off the
   * accounts it wrote — identities, refresh tokens, push tokens, rules acceptances, own notifications and the sign-in
   * code of the old email.
   */
  async eraseClosed(ids: string[], cutoff: Date): Promise<number> {
    if (ids.length === 0) return 0;

    return this.prisma.$transaction(async (tx) => {
      const where = { id: { in: ids }, ...closedBefore(cutoff) };
      const emails = await tx.user.findMany({ where, select: { id: true, email: true } });
      const erased = await tx.user.updateManyAndReturn({
        where,
        data: {
          status: 'erased',
          erasedAt: new Date(),
          name: null,
          email: null,
          photoUrl: null,
          whatsappNumber: null,
          whatsappVisible: false,
          denialReason: null,
          deniedAt: null,
          reactivationStatus: null,
          reactivationRequestedAt: null,
        },
        select: { id: true },
      });
      const erasedIds = erased.map((record) => record.id);
      if (erasedIds.length === 0) return 0;

      const oldEmails = emails
        .filter((record) => erasedIds.includes(record.id) && record.email !== null)
        .map((record) => record.email as string);
      const byUser = { where: { userId: { in: erasedIds } } };

      await tx.identity.deleteMany(byUser);
      await tx.refreshToken.deleteMany(byUser);
      await tx.pushToken.deleteMany(byUser);
      await tx.userRulesAcceptance.deleteMany(byUser);
      await tx.notification.deleteMany(byUser);
      await tx.signInCode.deleteMany({ where: { email: { in: oldEmails } } });

      return erasedIds.length;
    });
  }

  async addRulesAcceptance(userId: string, acceptance: RulesAcceptance): Promise<void> {
    await this.prisma.userRulesAcceptance.createMany({
      data: [
        { userId, version: acceptance.version, acceptedAt: acceptance.acceptedAt },
      ],
      skipDuplicates: true,
    });
  }

  async countApprovedAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'admin', status: 'approved' } });
  }

  /**
   * One transaction that first locks the approved admins' rows, in id order, then the user's: two writes that would
   * each take away an admin run one after the other, and the second sees the first's result (Postgres re-checks a
   * locked row against the condition once the other transaction commits).
   */
  async updateKeepingAnAdmin(user: User, expected: ExpectedUserState): Promise<KeepAdminResult> {
    return this.prisma.$transaction(async (tx): Promise<KeepAdminResult> => {
      const admins = await tx.$queryRaw<{ id: string }[]>(
        Prisma.sql`SELECT id FROM users WHERE role = 'admin' AND status = 'approved' ORDER BY id FOR UPDATE`,
      );
      const [stored] = await tx.$queryRaw<{ role: string; status: string }[]>(
        Prisma.sql`SELECT role::text AS role, status::text AS status FROM users WHERE id = ${user.id}::uuid FOR UPDATE`,
      );

      if (!stored || stored.role !== expected.role || stored.status !== expected.status) return 'changed';

      const wasAdmin = stored.role === 'admin' && stored.status === 'approved';
      const staysAdmin = user.role === 'admin' && user.status === 'approved';
      if (wasAdmin && !staysAdmin && admins.length <= 1) return 'lastAdmin';

      await tx.user.update({
        where: { id: user.id },
        data: {
          ...this.toData(user),
          rulesAcceptances: { deleteMany: {}, create: this.toAcceptances(user) },
        },
      });

      return 'updated';
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

  /** Only records that aren't erased reach here, so the name, the email and the status are the domain's. */
  private toDomain(record: UserRecordWithAcceptances): User {
    return new User({
      id: record.id,
      name: record.name as string,
      email: record.email as string,
      photoUrl: record.photoUrl ?? undefined,
      whatsappNumber: record.whatsappNumber ?? undefined,
      whatsappVisible: record.whatsappVisible,
      role: record.role,
      status: record.status as UserStatus,
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
