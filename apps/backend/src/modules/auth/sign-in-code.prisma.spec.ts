import { SignInCode } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaSignInCodeRepository } from './sign-in-code.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const HASH = 'a'.repeat(64);
const NOW = new Date('2026-10-07T12:00:00.000Z');

const record = {
  id: ID,
  email: 'ana@example.com',
  codeHash: HASH,
  expiresAt: new Date('2026-10-07T12:10:00.000Z'),
  lastSentAt: NOW,
  attempts: 2,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
};

function setup() {
  const signInCode = {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
    updateMany: vi.fn(),
  };
  const repository = new PrismaSignInCodeRepository({ signInCode } as unknown as PrismaService);
  return { signInCode, repository };
}

describe('PrismaSignInCodeRepository', () => {
  it('finds the code of an email', async () => {
    const { signInCode, repository } = setup();
    signInCode.findUnique.mockResolvedValueOnce(record).mockResolvedValueOnce(null);

    const found = await repository.findByEmail('ana@example.com');

    expect(signInCode.findUnique).toHaveBeenCalledWith({ where: { email: 'ana@example.com' } });
    expect(found).toBeInstanceOf(SignInCode);
    expect(found).toMatchObject({
      id: ID,
      email: 'ana@example.com',
      codeHash: HASH,
      expiresAt: record.expiresAt,
      lastSentAt: NOW,
      attempts: 2,
    });
    await expect(repository.findByEmail('bia@example.com')).resolves.toBeNull();
  });

  it('saves with an upsert by email that resets every value', async () => {
    const { signInCode, repository } = setup();
    signInCode.upsert.mockResolvedValue({ ...record, attempts: 0 });
    const code = new SignInCode({
      id: ID,
      email: 'ana@example.com',
      codeHash: HASH,
      expiresAt: record.expiresAt,
      lastSentAt: NOW,
      attempts: 0,
    });

    const saved = await repository.save(code);

    const values = {
      codeHash: HASH,
      expiresAt: record.expiresAt,
      lastSentAt: NOW,
      attempts: 0,
    };
    expect(signInCode.upsert).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
      create: { id: ID, email: 'ana@example.com', ...values },
      update: values,
    });
    expect(saved.attempts).toBe(0);
  });

  it('deletes the code of an email', async () => {
    const { signInCode, repository } = setup();
    signInCode.deleteMany.mockResolvedValue({ count: 1 });

    await repository.deleteByEmail('ana@example.com');

    expect(signInCode.deleteMany).toHaveBeenCalledWith({ where: { email: 'ana@example.com' } });
  });

  it('increments the attempts atomically in the database', async () => {
    const { signInCode, repository } = setup();
    signInCode.updateMany.mockResolvedValue({ count: 1 });

    await repository.incrementAttempts('ana@example.com');

    expect(signInCode.updateMany).toHaveBeenCalledWith({
      where: { email: 'ana@example.com' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('consumes a code only when one row with that hash was deleted', async () => {
    const { signInCode, repository } = setup();
    signInCode.deleteMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    await expect(repository.consume('ana@example.com', HASH)).resolves.toBe(true);
    await expect(repository.consume('ana@example.com', HASH)).resolves.toBe(false);
    expect(signInCode.deleteMany).toHaveBeenCalledWith({
      where: { email: 'ana@example.com', codeHash: HASH },
    });
  });

  it('deletes the codes that expired before now and returns how many', async () => {
    const { signInCode, repository } = setup();
    signInCode.deleteMany.mockResolvedValue({ count: 3 });

    await expect(repository.deleteExpired(NOW)).resolves.toBe(3);
    expect(signInCode.deleteMany).toHaveBeenCalledWith({ where: { expiresAt: { lt: NOW } } });
  });
});
