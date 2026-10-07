import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './resend.email.js';

const resend = vi.hoisted(() => ({ send: vi.fn(), constructed: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resend.send };
    constructor(apiKey: string) {
      resend.constructed(apiKey);
    }
  },
}));

const INPUT = {
  to: 'ana@example.com',
  code: '123456',
  idempotencyKey: 'signin-code:ana@example.com:1791374400000',
};

function configured(env: Record<string, string> = {}) {
  return new ResendEmailProvider(
    new ConfigService({ RESEND_API_KEY: 're_test', EMAIL_FROM: 'codes@example.com', ...env }),
  );
}

describe('ResendEmailProvider', () => {
  beforeEach(() => {
    resend.send.mockReset().mockResolvedValue({ data: { id: 'email-1' }, error: null });
    resend.constructed.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the pt-BR email through Resend with the idempotency key', async () => {
    await configured().sendSignInCode({ ...INPUT, locale: 'pt-BR' });

    expect(resend.constructed).toHaveBeenCalledWith('re_test');
    const text =
      'Seu código de acesso é 123456. Ele expira em 10 minutos. Se você não pediu este código, ignore este e-mail.';
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect(resend.send).toHaveBeenCalledWith(
      {
        from: 'codes@example.com',
        to: 'ana@example.com',
        subject: "123456 é o seu código da Rocha's Surf School",
        text,
        html: `<p>${text}</p>`,
      },
      { idempotencyKey: INPUT.idempotencyKey },
    );
  });

  it('sends the es copy', async () => {
    await configured().sendSignInCode({ ...INPUT, locale: 'es' });

    const payload = resend.send.mock.calls[0]![0] as { subject: string; text: string; html: string };
    expect(payload.subject).toBe("123456 es tu código de Rocha's Surf School");
    expect(payload.text).toBe(
      'Tu código de acceso es 123456. Caduca en 10 minutos. Si no solicitaste este código, ignora este correo.',
    );
  });

  it('sends the en copy with the apostrophe escaped in the html', async () => {
    await configured().sendSignInCode({ ...INPUT, locale: 'en' });

    const payload = resend.send.mock.calls[0]![0] as { subject: string; text: string; html: string };
    expect(payload.subject).toBe("123456 is your Rocha's Surf School code");
    expect(payload.text).toBe(
      "Your sign-in code is 123456. It expires in 10 minutes. If you didn't ask for this code, ignore this email.",
    );
    expect(payload.html).toBe(
      '<p>Your sign-in code is 123456. It expires in 10 minutes. If you didn&#39;t ask for this code, ignore this email.</p>',
    );
  });

  it('escapes html special characters', async () => {
    await configured().sendSignInCode({ ...INPUT, code: '<a&"b>', locale: 'en' });

    const payload = resend.send.mock.calls[0]![0] as { html: string };
    expect(payload.html).toContain('&lt;a&amp;&quot;b&gt;');
  });

  it('rejects when Resend answers with an error', async () => {
    resend.send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', statusCode: 422, message: 'Invalid from' },
    });

    await expect(configured().sendSignInCode({ ...INPUT, locale: 'en' })).rejects.toThrow(
      'validation_error',
    );
  });

  it('logs the code instead of sending when RESEND_API_KEY is unset outside production', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const provider = new ResendEmailProvider(new ConfigService({ NODE_ENV: 'development' }));

    await provider.sendSignInCode({ ...INPUT, locale: 'pt-BR' });

    expect(resend.constructed).not.toHaveBeenCalled();
    expect(resend.send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('ana@example.com'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('123456'));
  });

  it('refuses to start in production without RESEND_API_KEY', () => {
    expect(
      () => new ResendEmailProvider(new ConfigService({ NODE_ENV: 'production' })),
    ).toThrow('RESEND_API_KEY is not configured');
  });

  it('refuses to start with RESEND_API_KEY but no EMAIL_FROM', () => {
    expect(
      () => new ResendEmailProvider(new ConfigService({ RESEND_API_KEY: 're_test' })),
    ).toThrow('EMAIL_FROM is not configured');
  });
});
