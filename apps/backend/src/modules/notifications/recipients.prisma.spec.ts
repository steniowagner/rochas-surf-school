import { PrismaService } from '../../db/prisma.service.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';

describe('PrismaRecipientsProvider', () => {
  it('returns the ids of the approved admins', async () => {
    const user = { findMany: vi.fn().mockResolvedValue([{ id: 'a1' }, { id: 'a2' }]) };
    const provider = new PrismaRecipientsProvider({ user } as unknown as PrismaService);

    await expect(provider.findApprovedAdminIds()).resolves.toEqual(['a1', 'a2']);
    expect(user.findMany).toHaveBeenCalledWith({
      where: { role: 'admin', status: 'approved' },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
  });
});
