import { createHmac } from 'node:crypto';
import { AuthConfig } from './auth.config.js';
import { HmacSignInCodeProvider } from './hmac.sign-in-code.js';

const randomInt = vi.hoisted(() => vi.fn<(min: number, max: number) => number>());

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  randomInt.mockImplementation((min, max) => actual.randomInt(min, max));
  return { ...actual, randomInt };
});

const withPepper = (codePepper: string) =>
  new HmacSignInCodeProvider({ codePepper } as AuthConfig);
const provider = () => withPepper('pepper');

describe('HmacSignInCodeProvider', () => {
  it('draws the code from 0 to 999999 and pads it to 6 digits', () => {
    randomInt.mockReturnValueOnce(42).mockReturnValueOnce(999_999);

    expect(provider().generate()).toBe('000042');
    expect(provider().generate()).toBe('999999');
    expect(randomInt).toHaveBeenCalledWith(0, 1_000_000);
  });

  it('generates 6-digit codes', () => {
    for (let i = 0; i < 50; i++) {
      expect(provider().generate()).toMatch(/^\d{6}$/);
    }
  });

  it('hashes with HMAC-SHA256 keyed by the pepper over email:code', () => {
    const hash = provider().hash('ana@example.com', '123456');

    expect(hash).toBe(
      createHmac('sha256', 'pepper').update('ana@example.com:123456').digest('hex'),
    );
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('123456');
  });

  it('gives the same hash for the same input and a different one for another pepper', () => {
    const other = withPepper('other');

    expect(provider().hash('ana@example.com', '123456')).toBe(
      provider().hash('ana@example.com', '123456'),
    );
    expect(other.hash('ana@example.com', '123456')).not.toBe(
      provider().hash('ana@example.com', '123456'),
    );
  });

  it('matches only the right code for the right email', () => {
    const hash = provider().hash('ana@example.com', '123456');

    expect(provider().matches(hash, 'ana@example.com', '123456')).toBe(true);
    expect(provider().matches(hash, 'ana@example.com', '123457')).toBe(false);
    expect(provider().matches(hash, 'bia@example.com', '123456')).toBe(false);
  });

  it('does not match a hash of another length', () => {
    expect(provider().matches('abcd', 'ana@example.com', '123456')).toBe(false);
  });
});
