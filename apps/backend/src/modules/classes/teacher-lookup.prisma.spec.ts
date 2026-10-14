import { PrismaService } from '../../db/prisma.service.js';
import { PrismaTeacherLookup } from './teacher-lookup.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';

describe('PrismaTeacherLookup', () => {
  it('reads the id, role and status of the given users', async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: ID, role: 'instructor', status: 'approved' }]);
    const lookup = new PrismaTeacherLookup({ user: { findMany } } as unknown as PrismaService);

    const teachers = await lookup.findTeachers([ID]);

    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: [ID] } },
      select: { id: true, role: true, status: true },
    });
    expect(teachers).toEqual([{ id: ID, role: 'instructor', status: 'approved' }]);
  });
});
