import { PrismaService } from '../../db/prisma.service.js';
import { PrismaStudentLookup } from './student-lookup.prisma.js';

function setup() {
  const user = { count: vi.fn() };
  const lookup = new PrismaStudentLookup({ user } as unknown as PrismaService);

  return { user, lookup };
}

describe('PrismaStudentLookup', () => {
  it('asks for an approved account with the student role', async () => {
    const { user, lookup } = setup();
    user.count.mockResolvedValue(1);

    expect(await lookup.isApprovedStudent('u-1')).toBe(true);
    expect(user.count).toHaveBeenCalledWith({ where: { id: 'u-1', role: 'student', status: 'approved' } });
  });

  it('answers false when there is no such student', async () => {
    const { user, lookup } = setup();
    user.count.mockResolvedValue(0);

    expect(await lookup.isApprovedStudent('u-1')).toBe(false);
  });
});
