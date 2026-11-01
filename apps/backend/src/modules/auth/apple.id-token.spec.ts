import { ConfigService } from '@nestjs/config';
import {
  JWTPayload,
  KeyObject,
  SignJWT,
  createLocalJWKSet,
  createRemoteJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';
import { AppleAuthIdTokenProvider } from './apple.id-token.js';
import { AuthConfig } from './auth.config.js';

const remote = vi.hoisted(() => ({ getKey: vi.fn() }));

vi.mock('jose', async (importOriginal) => ({
  ...(await importOriginal<typeof import('jose')>()),
  createRemoteJWKSet: vi.fn(() => remote.getKey),
}));

const AUDIENCE = 'com.example.app';
const ISSUER = 'https://appleid.apple.com';

function provider(env: Record<string, string> = { APPLE_CLIENT_ID: AUDIENCE }) {
  return new AppleAuthIdTokenProvider(
    new AuthConfig(new ConfigService({ AUTH_CODE_PEPPER: 'pepper', ...env })),
  );
}

describe('AppleAuthIdTokenProvider', () => {
  let appleKey: CryptoKey | KeyObject;
  let otherKey: CryptoKey | KeyObject;

  beforeAll(async () => {
    const pair = await generateKeyPair('RS256', { extractable: true });
    appleKey = pair.privateKey;
    otherKey = (await generateKeyPair('RS256')).privateKey;
    const jwk = {
      ...(await exportJWK(pair.publicKey)),
      kid: 'apple',
      alg: 'RS256',
    };
    remote.getKey.mockImplementation(createLocalJWKSet({ keys: [jwk] }));
  });

  beforeEach(() => {
    remote.getKey.mockClear();
  });

  function sign(
    claims: JWTPayload = {
      sub: 's1',
      email: 'maria@example.com',
      email_verified: true,
    },
    options: {
      key?: CryptoKey | KeyObject;
      issuer?: string;
      audience?: string;
      expiresAt?: string | number;
    } = {},
  ): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'apple' })
      .setIssuedAt(new Date('2020-01-01T00:00:00.000Z'))
      .setIssuer(options.issuer ?? ISSUER)
      .setAudience(options.audience ?? AUDIENCE)
      .setExpirationTime(options.expiresAt ?? '10m')
      .sign(options.key ?? appleKey);
  }

  it('maps the payload of a token signed by Apple, loading the keys from Apple', async () => {
    await expect(provider().verify(await sign())).resolves.toEqual({
      sub: 's1',
      email: 'maria@example.com',
      emailVerified: true,
    });
    expect(remote.getKey).toHaveBeenCalled();
    expect(createRemoteJWKSet).toHaveBeenCalledWith(
      new URL('https://appleid.apple.com/auth/keys'),
    );
  });

  it('string email_verified: "true" counts as verified and "false" as not', async () => {
    const verified = await sign({
      sub: 's1',
      email: 'a@example.com',
      email_verified: 'true',
    });
    const unverified = await sign({
      sub: 's1',
      email: 'a@example.com',
      email_verified: 'false',
    });

    await expect(provider().verify(verified)).resolves.toMatchObject({
      emailVerified: true,
    });
    await expect(provider().verify(unverified)).resolves.toMatchObject({
      emailVerified: false,
    });
  });

  it('no email: answers email undefined and emailVerified false', async () => {
    await expect(provider().verify(await sign({ sub: 's1' }))).resolves.toEqual(
      {
        sub: 's1',
        email: undefined,
        emailVerified: false,
      },
    );
  });

  describe('rejects', () => {
    it('another issuer', async () => {
      const token = await sign(undefined, {
        issuer: 'https://accounts.google.com',
      });
      await expect(provider().verify(token)).rejects.toThrow('"iss"');
    });

    it('another audience', async () => {
      const token = await sign(undefined, { audience: 'com.other.app' });
      await expect(provider().verify(token)).rejects.toThrow('"aud"');
    });

    it('an expired token', async () => {
      const token = await sign(undefined, {
        expiresAt: new Date('2020-01-02T00:00:00.000Z').getTime() / 1000,
      });
      await expect(provider().verify(token)).rejects.toThrow('"exp"');
    });

    it('another signing key', async () => {
      const token = await sign(undefined, { key: otherKey });
      await expect(provider().verify(token)).rejects.toThrow(
        'signature verification failed',
      );
    });

    it('an algorithm other than RS256', async () => {
      const { privateKey } = await generateKeyPair('ES256');
      const token = await new SignJWT({ sub: 's1' })
        .setProtectedHeader({ alg: 'ES256', kid: 'apple' })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setExpirationTime('10m')
        .sign(privateKey);

      await expect(provider().verify(token)).rejects.toThrow('"alg"');
      expect(remote.getKey).not.toHaveBeenCalled();
    });

    it('a token without sub', async () => {
      const token = await sign({
        email: 'maria@example.com',
        email_verified: true,
      });
      await expect(provider().verify(token)).rejects.toThrow('no sub');
    });

    it('a malformed token', async () => {
      await expect(provider().verify('not-a-token')).rejects.toThrow();
    });

    it('keys that fail to load', async () => {
      const token = await sign();
      remote.getKey.mockRejectedValueOnce(new Error('network down'));

      await expect(provider().verify(token)).rejects.toThrow('network down');
    });
  });

  it('no client id: rejects every token without loading the keys', async () => {
    await expect(provider({}).verify(await sign())).rejects.toThrow(
      'APPLE_CLIENT_ID',
    );
    expect(remote.getKey).not.toHaveBeenCalled();
  });

  it('a trimmed client id is the audience', async () => {
    await expect(
      provider({ APPLE_CLIENT_ID: ` ${AUDIENCE} ` }).verify(await sign()),
    ).resolves.toMatchObject({ sub: 's1' });
  });
});
