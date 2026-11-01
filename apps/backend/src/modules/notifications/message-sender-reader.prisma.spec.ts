import { PrismaService } from '../../db/prisma.service.js';
import { PrismaMessageSenderReader } from './message-sender-reader.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const SENDER = {
  id: ID,
  name: 'Ana Souza',
  photoUrl: null,
  role: 'admin',
  status: 'approved',
  whatsappNumber: '+5585999999999',
  whatsappVisible: false,
};

describe('PrismaMessageSenderReader', () => {
  it('reads the accounts found, by id, leaving erased ones out', async () => {
    const findMany = vi.fn().mockResolvedValue([SENDER]);
    const reader = new PrismaMessageSenderReader({ user: { findMany } } as unknown as PrismaService);

    const senders = await reader.findSenders([ID, 'missing']);

    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [ID, 'missing'] }, status: { not: 'erased' } },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        role: true,
        status: true,
        whatsappNumber: true,
        whatsappVisible: true,
      },
    });
    expect(senders).toEqual(new Map([[ID, SENDER]]));
  });
});
