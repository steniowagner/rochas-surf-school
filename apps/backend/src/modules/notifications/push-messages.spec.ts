import {
  NOTIFICATION_TYPES,
  PUSH_LOCALES,
} from '@rochas-surf-school/notifications';
import { renderPush } from './push-messages.js';

describe('renderPush', () => {
  it.each([
    ['pt-BR', 'Nova inscrição', 'Ana Souza está aguardando aprovação.'],
    ['es', 'Nueva inscripción', 'Ana Souza está esperando aprobación.'],
    ['en', 'New registration', 'Ana Souza is waiting for approval.'],
  ] as const)('writes the pending registration in %s', (locale, title, body) => {
    expect(renderPush('registration.pending', { name: 'Ana Souza' }, locale)).toEqual({ title, body });
  });

  it.each([
    ['pt-BR', 'Conta aprovada', 'Você já pode começar a usar o app.'],
    ['es', 'Cuenta aprobada', 'Ya puedes empezar a usar la app.'],
    ['en', 'Account approved', 'You can start using the app now.'],
  ] as const)('writes the approval in %s', (locale, title, body) => {
    expect(renderPush('registration.approved', {}, locale)).toEqual({ title, body });
  });

  it.each([
    ['pt-BR', 'Inscrição recusada', 'Abra o app para saber mais.'],
    ['es', 'Inscripción rechazada', 'Abre la app para saber más.'],
    ['en', 'Registration denied', 'Open the app to learn more.'],
  ] as const)('writes the denial in %s, with the reason as written or the fallback', (locale, title, fallback) => {
    expect(renderPush('registration.denied', { reason: 'Não conhecemos você.' }, locale)).toEqual({
      title,
      body: 'Não conhecemos você.',
    });
    expect(renderPush('registration.denied', {}, locale)).toEqual({ title, body: fallback });
    expect(renderPush('registration.denied', { reason: '   ' }, locale).body).toBe(fallback);
    expect(renderPush('registration.denied', { reason: 5 }, locale).body).toBe(fallback);
  });

  it('has copy for every type and locale', () => {
    for (const type of NOTIFICATION_TYPES) {
      for (const locale of PUSH_LOCALES) {
        const { title, body } = renderPush(type, { name: 'Ana', reason: 'x' }, locale);
        expect(title).not.toBe('');
        expect(body).not.toBe('');
      }
    }
  });
});
