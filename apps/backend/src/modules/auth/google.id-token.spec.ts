import { ConfigService } from '@nestjs/config';
import { AuthConfig } from './auth.config.js';
import { GoogleAuthIdTokenProvider } from './google.id-token.js';

const google = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = google.verifyIdToken;
  },
}));

function provider(env: Record<string, string> = { GOOGLE_WEB_CLIENT_ID: 'web-client' }) {
  return new GoogleAuthIdTokenProvider(
    new AuthConfig(new ConfigService({ AUTH_CODE_PEPPER: 'pepper', ...env })),
  );
}

function ticket(payload: Record<string, unknown> | undefined) {
  return { getPayload: () => payload };
}

describe('GoogleAuthIdTokenProvider', () => {
  beforeEach(() => {
    google.verifyIdToken.mockReset();
  });

  it('maps the verified payload and passes the web client id as audience', async () => {
    google.verifyIdToken.mockResolvedValue(
      ticket({ sub: 's1', email: 'maria@example.com', email_verified: true, name: 'Maria Silva' }),
    );

    await expect(provider().verify('token')).resolves.toEqual({
      sub: 's1',
      email: 'maria@example.com',
      emailVerified: true,
      name: 'Maria Silva',
    });
    expect(google.verifyIdToken).toHaveBeenCalledWith({
      idToken: 'token',
      audience: 'web-client',
    });
  });

  it.each([
    ['https://lh3.googleusercontent.com/a/ana=s96-c', 'https://lh3.googleusercontent.com/a/ana=s400-c'],
    ['https://lh3.googleusercontent.com/a/ana', 'https://lh3.googleusercontent.com/a/ana'],
  ])('asks for the larger picture when the URL names a size (%s)', async (picture, expected) => {
    google.verifyIdToken.mockResolvedValue(
      ticket({ sub: 's1', email: 'maria@example.com', picture }),
    );

    await expect(provider().verify('token')).resolves.toMatchObject({ picture: expected });
  });

  it('reports an email that is not verified as such', async () => {
    google.verifyIdToken.mockResolvedValue(ticket({ sub: 's1', email: 'maria@example.com' }));

    await expect(provider().verify('token')).resolves.toMatchObject({
      emailVerified: false,
      name: undefined,
    });
  });

  it('rejects when the library rejects the token', async () => {
    google.verifyIdToken.mockRejectedValue(new Error('Wrong recipient'));

    await expect(provider().verify('token')).rejects.toThrow('Wrong recipient');
  });

  it.each([undefined, { email: 'a@example.com' }, { sub: 's1' }])(
    'rejects a payload without sub or email (%j)',
    async (payload) => {
      google.verifyIdToken.mockResolvedValue(ticket(payload));

      await expect(provider().verify('token')).rejects.toThrow('no sub or email');
    },
  );

  it('no client id: rejects every token without calling Google', async () => {
    await expect(provider({}).verify('token')).rejects.toThrow('GOOGLE_WEB_CLIENT_ID');
    expect(google.verifyIdToken).not.toHaveBeenCalled();
  });
});
