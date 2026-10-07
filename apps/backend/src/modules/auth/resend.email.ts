import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProvider,
  SendSignInCodeIn,
  SignInLocale,
} from '@rochas-surf-school/auth';
import { Resend } from 'resend';

interface SignInCodeCopy {
  subject: string;
  text: string;
}

// The one user-facing text the backend sends: email can't be translated by the app.
const COPY: Record<SignInLocale, (code: string) => SignInCodeCopy> = {
  'pt-BR': (code) => ({
    subject: `${code} é o seu código da Rocha's Surf School`,
    text: `Seu código de acesso é ${code}. Ele expira em 10 minutos. Se você não pediu este código, ignore este e-mail.`,
  }),
  es: (code) => ({
    subject: `${code} es tu código de Rocha's Surf School`,
    text: `Tu código de acceso es ${code}. Caduca en 10 minutos. Si no solicitaste este código, ignora este correo.`,
  }),
  en: (code) => ({
    subject: `${code} is your Rocha's Surf School code`,
    text: `Your sign-in code is ${code}. It expires in 10 minutes. If you didn't ask for this code, ignore this email.`,
  }),
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly client?: Resend;
  private readonly from?: string;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      if (configService.get<string>('NODE_ENV') === 'production') {
        throw new Error('RESEND_API_KEY is not configured');
      }
      return;
    }

    const from = configService.get<string>('EMAIL_FROM');
    if (!from) {
      throw new Error('EMAIL_FROM is not configured');
    }
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async sendSignInCode(input: SendSignInCodeIn): Promise<void> {
    if (!this.client) {
      this.logger.log(`Sign-in code for ${input.to}: ${input.code} (RESEND_API_KEY unset, not sent)`);
      return;
    }

    const { subject, text } = COPY[input.locale](input.code);
    const { error } = await this.client.emails.send(
      {
        from: this.from!,
        to: input.to,
        subject,
        text,
        html: `<p>${escapeHtml(text)}</p>`,
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (error) {
      throw new Error(`Resend failed to send the sign-in code: ${error.name} ${error.message}`);
    }
  }
}
