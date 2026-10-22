import { PrismaService } from '../../db/prisma.service.js';
import { PrismaClassContactReader } from './class-contact-reader.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const CONTACT = {
  id: ID,
  role: 'student',
  status: 'approved',
  whatsappNumber: '+5585999999999',
  whatsappVisible: false,
};

function setup(users: unknown[] = []) {
  const findMany = vi.fn().mockResolvedValue(users);
  const reader = new PrismaClassContactReader({ user: { findMany } } as unknown as PrismaService);

  return { findMany, reader };
}

describe('PrismaClassContactReader', () => {
  it('reads the role, status and number of the given users, by id', async () => {
    const { findMany, reader } = setup([CONTACT]);

    const contacts = await reader.findContacts([ID, 'missing']);

    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [ID, 'missing'] } },
      select: { id: true, role: true, status: true, whatsappNumber: true, whatsappVisible: true },
    });
    expect(contacts).toEqual(new Map([[ID, CONTACT]]));
  });

  it('reads nothing for no ids', async () => {
    const { findMany, reader } = setup();

    expect(await reader.findContacts([])).toEqual(new Map());
    expect(findMany).not.toHaveBeenCalled();
  });
});
