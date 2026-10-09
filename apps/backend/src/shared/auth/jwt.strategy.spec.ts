import { ConfigService } from '@nestjs/config';
import { UnauthorizedError } from '@rochas-surf-school/shared';
import { PrismaService } from '../../db/prisma.service.js';
import { JwtStrategy } from './jwt.strategy.js';

function setup(record: unknown = null) {
  const findUnique = vi.fn().mockResolvedValue(record);
  const prisma = { user: { findUnique } } as unknown as PrismaService;
  const strategy = new JwtStrategy(new ConfigService({ JWT_SECRET: 'secret' }), prisma);
  return { findUnique, strategy };
}

describe('JwtStrategy', () => {
  it('refuses to start without JWT_SECRET', () => {
    expect(
      () => new JwtStrategy(new ConfigService({}), {} as PrismaService),
    ).toThrow('JWT_SECRET is not configured');
  });

  it('loads the account named by the token and returns its current role and status', async () => {
    const record = {
      id: 'user-1',
      email: 'ana@example.com',
      role: 'instructor',
      status: 'approved',
    };
    const { findUnique, strategy } = setup(record);
    const payload = { sub: 'user-1', email: 'ana@example.com', role: 'student' };

    await expect(strategy.validate(payload)).resolves.toEqual({ ...record, claims: payload });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { id: true, email: true, role: true, status: true },
    });
  });

  it('reads the database on every call, not the token (role and status reloaded)', async () => {
    const { findUnique, strategy } = setup();
    findUnique
      .mockResolvedValueOnce({ id: 'u', email: 'a@b.c', role: 'student', status: 'pending' })
      .mockResolvedValueOnce({ id: 'u', email: 'a@b.c', role: 'instructor', status: 'approved' });
    const payload = { sub: 'u' };

    await expect(strategy.validate(payload)).resolves.toMatchObject({
      role: 'student',
      status: 'pending',
    });
    await expect(strategy.validate(payload)).resolves.toMatchObject({
      role: 'instructor',
      status: 'approved',
    });
  });

  it('refuses a token whose account no longer exists with auth.token.invalid', async () => {
    const { strategy } = setup(null);

    const error = await strategy.validate({ sub: 'gone' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).toMatchObject({ message: 'auth.token.invalid', statusCode: 401 });
  });
});
