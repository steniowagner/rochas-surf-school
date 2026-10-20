import { PrismaService } from '../../db/prisma.service.js';
import { PrismaStudentNameReader } from './student-name-reader.prisma.js';

function setup() {
  const user = { findUnique: vi.fn() };
  const reader = new PrismaStudentNameReader({ user } as unknown as PrismaService);

  return { user, reader };
}

describe('PrismaStudentNameReader', () => {
  it('reads the name of the user', async () => {
    const { user, reader } = setup();
    user.findUnique.mockResolvedValue({ name: 'Ana Souza' });

    expect(await reader.findName('u-1')).toBe('Ana Souza');
    expect(user.findUnique).toHaveBeenCalledWith({ where: { id: 'u-1' }, select: { name: true } });
  });

  it('answers null when there is no such user', async () => {
    const { user, reader } = setup();
    user.findUnique.mockResolvedValue(null);

    expect(await reader.findName('u-1')).toBeNull();
  });
});
