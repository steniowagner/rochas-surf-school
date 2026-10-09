import { createHash } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenProvider } from './jwt.token.js';

const SECRET = 'test-secret';
const USER = { id: '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e', email: 'ana@example.com' };

function provider() {
  const jwtService = new JwtService({ secret: SECRET, signOptions: { expiresIn: '15m' } });
  return { jwtService, provider: new JwtTokenProvider(jwtService) };
}

describe('JwtTokenProvider', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs an HS256 access token for the user that expires in 15 minutes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00.000Z'));
    const { jwtService, provider: tokens } = provider();

    const { token, expiresAt } = tokens.signAccessToken(USER);

    const header = JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString()) as {
      alg: string;
    };
    expect(header.alg).toBe('HS256');
    const payload = jwtService.verify<{ sub: string; email: string; iat: number; exp: number }>(
      token,
      { secret: SECRET },
    );
    expect(payload.sub).toBe(USER.id);
    expect(payload.email).toBe(USER.email);
    expect(payload.exp - payload.iat).toBe(15 * 60);
    expect(expiresAt).toEqual(new Date('2026-10-07T12:15:00.000Z'));
  });

  it('rejects a token verified with another secret', () => {
    const { jwtService, provider: tokens } = provider();
    const { token } = tokens.signAccessToken(USER);

    expect(() => jwtService.verify(token, { secret: 'other' })).toThrow();
  });

  it('generates a 32-byte base64url refresh token and its SHA-256 hex hash', () => {
    const { provider: tokens } = provider();

    const { token, hash } = tokens.generateRefreshToken();

    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes a plaintext refresh token the way generateRefreshToken does', () => {
    const { provider: tokens } = provider();
    const { token, hash } = tokens.generateRefreshToken();

    expect(tokens.hashRefreshToken(token)).toBe(hash);
    expect(tokens.hashRefreshToken('other')).toBe(
      createHash('sha256').update('other').digest('hex'),
    );
  });

  it('generates a different refresh token every time', () => {
    const { provider: tokens } = provider();

    expect(tokens.generateRefreshToken().token).not.toBe(tokens.generateRefreshToken().token);
  });
});
