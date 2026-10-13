import { Injectable } from '@nestjs/common';
import { RecipientsProvider } from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';

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
}
