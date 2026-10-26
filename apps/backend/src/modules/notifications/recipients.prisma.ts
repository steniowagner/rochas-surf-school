import { Injectable } from '@nestjs/common';
import { BroadcastAudience, RecipientsProvider } from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';

const AUDIENCE_ROLES = {
  all: ['student', 'instructor', 'admin'],
  students: ['student'],
  instructors: ['instructor'],
} as const;

/** The admins notified of a registration: role admin and status approved, onboarding finished or not. */
@Injectable()
export class PrismaRecipientsProvider implements RecipientsProvider {
  constructor(private readonly prisma: PrismaService) {}

  async findApprovedAdminIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'admin', status: 'approved' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return admins.map((admin) => admin.id);
  }

  /** Approved users only (never pending, denied, deleted or removed), whose role the audience covers. */
  async findApprovedUserIdsByAudience(audience: BroadcastAudience): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { role: { in: [...AUDIENCE_ROLES[audience]] }, status: 'approved' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return users.map((user) => user.id);
  }
}
