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

  it.each([
    ['pt-BR', 'Novas aulas na sua escala', 'Você foi escalado para 1 aula de Surf.', 'Você foi escalado para 4 aulas de Surf.'],
    ['es', 'Nuevas clases en tu agenda', 'Te asignaron 1 clase de Surf.', 'Te asignaron 4 clases de Surf.'],
    ['en', 'New classes on your schedule', "You've been assigned 1 Surf class.", "You've been assigned 4 Surf classes."],
  ] as const)('writes the class assignment in %s, singular and plural', (locale, title, one, many) => {
    expect(renderPush('class.assigned', { count: 1, discipline: 'surf' }, locale)).toEqual({ title, body: one });
    expect(renderPush('class.assigned', { count: 4, discipline: 'surf' }, locale)).toEqual({ title, body: many });
  });

  it('names Skate for a skate class and falls back on a bad count or discipline', () => {
    expect(renderPush('class.assigned', { count: 2, discipline: 'skate' }, 'en').body).toBe(
      "You've been assigned 2 Skate classes.",
    );
    expect(renderPush('class.assigned', { count: 'x', discipline: 5 }, 'en').body).toBe(
      "You've been assigned 1  class.",
    );
    expect(renderPush('class.assigned', { count: 2, discipline: 'tennis' }, 'en').body).toBe(
      "You've been assigned 2  classes.",
    );
  });

  const STARTS_AT = '2026-10-18T11:00:00.000Z'; // 08:00 in Fortaleza

  it.each([
    ['pt-BR', 'Aula alterada', 'A aula de Surf de 18/10 às 08:00 foi alterada. Abra o app para ver.'],
    ['es', 'Clase modificada', 'La clase de Surf del 18/10 a las 08:00 cambió. Abre la app para verla.'],
    ['en', 'Class changed', 'Your Surf class on 10/18 at 08:00 was changed. Open the app to see it.'],
  ] as const)('writes the edited class in %s', (locale, title, body) => {
    expect(renderPush('class.edited', { discipline: 'surf', startsAt: STARTS_AT }, locale)).toEqual({ title, body });
  });

  it.each([
    ['pt-BR', 'Você saiu de uma aula', 'Você não dá mais a aula de Skate de 18/10 às 08:00.'],
    ['es', 'Saliste de una clase', 'Ya no das la clase de Skate del 18/10 a las 08:00.'],
    ['en', 'Removed from a class', "You're no longer teaching the Skate class on 10/18 at 08:00."],
  ] as const)('writes the unassigned class in %s', (locale, title, body) => {
    expect(renderPush('class.unassigned', { discipline: 'skate', startsAt: STARTS_AT }, locale)).toEqual({
      title,
      body,
    });
  });

  it.each([
    ['pt-BR', 'Aula cancelada', 'A aula de Surf de 18/10 às 08:00 foi cancelada.', 'Surf, 18/10 às 08:00: Mar muito grande.'],
    ['es', 'Clase cancelada', 'La clase de Surf del 18/10 a las 08:00 fue cancelada.', 'Surf, 18/10 a las 08:00: Mar muito grande.'],
    ['en', 'Class cancelled', 'Your Surf class on 10/18 at 08:00 was cancelled.', 'Surf, 10/18 at 08:00: Mar muito grande.'],
  ] as const)('writes the cancelled class in %s, with and without the message', (locale, title, plain, withMessage) => {
    const params = { discipline: 'surf', startsAt: STARTS_AT };

    expect(renderPush('class.cancelled', params, locale)).toEqual({ title, body: plain });
    expect(renderPush('class.cancelled', { ...params, message: '  Mar muito grande.  ' }, locale)).toEqual({
      title,
      body: withMessage,
    });
  });

  it.each([
    ['pt-BR', 'Aula excluída', 'A aula de Surf de 18/10 às 08:00 foi excluída.'],
    ['es', 'Clase eliminada', 'La clase de Surf del 18/10 a las 08:00 fue eliminada.'],
    ['en', 'Class deleted', 'Your Surf class on 10/18 at 08:00 was deleted.'],
  ] as const)('writes the deleted class in %s', (locale, title, body) => {
    expect(renderPush('class.deleted', { discipline: 'surf', startsAt: STARTS_AT }, locale)).toEqual({ title, body });
  });

  it.each([[undefined], [''], ['   '], [42]])('counts %j as no cancellation message', (message) => {
    expect(renderPush('class.cancelled', { discipline: 'skate', startsAt: STARTS_AT, message }, 'pt-BR').body).toBe(
      'A aula de Skate de 18/10 às 08:00 foi cancelada.',
    );
  });

  it.each([
    [
      'pt-BR',
      'Aula sem instrutor',
      'A aula de Surf de 18/10 às 08:00 ficou sem instrutor.',
      'Aulas sem instrutor',
      '3 aulas ficaram sem instrutor. A próxima: Surf, 18/10 às 08:00.',
    ],
    [
      'es',
      'Clase sin instructor',
      'La clase de Surf del 18/10 a las 08:00 se quedó sin instructor.',
      'Clases sin instructor',
      '3 clases se quedaron sin instructor. La próxima: Surf, 18/10 a las 08:00.',
    ],
    [
      'en',
      'Class without an instructor',
      'The Surf class on 10/18 at 08:00 has no instructor now.',
      'Classes without an instructor',
      '3 classes have no instructor now. The next one: Surf, 10/18 at 08:00.',
    ],
  ] as const)('writes the classes left without an instructor in %s, one and many', (locale, oneTitle, one, manyTitle, many) => {
    const params = { classId: 'c-1', discipline: 'surf', startsAt: STARTS_AT };

    expect(renderPush('class.noInstructor', { ...params, count: 1 }, locale)).toEqual({ title: oneTitle, body: one });
    expect(renderPush('class.noInstructor', { ...params, count: 3 }, locale)).toEqual({ title: manyTitle, body: many });
  });

  it('counts a missing no-instructor count as one class', () => {
    expect(renderPush('class.noInstructor', { discipline: 'skate', startsAt: STARTS_AT }, 'pt-BR')).toEqual({
      title: 'Aula sem instrutor',
      body: 'A aula de Skate de 18/10 às 08:00 ficou sem instrutor.',
    });
  });

  it.each([
    [
      'pt-BR',
      'Local de aula alterado',
      'O local Praia do Futuro mudou. Confira sua próxima aula lá.',
      'O local Praia do Futuro mudou. Confira suas 3 próximas aulas lá.',
    ],
    [
      'es',
      'Lugar de clase modificado',
      'El lugar Praia do Futuro cambió. Revisa tu próxima clase allí.',
      'El lugar Praia do Futuro cambió. Revisa tus 3 próximas clases allí.',
    ],
    [
      'en',
      'Class location changed',
      'Praia do Futuro changed. Check your next class there.',
      'Praia do Futuro changed. Check your 3 upcoming classes there.',
    ],
  ] as const)('writes the changed location in %s, singular and plural', (locale, title, one, many) => {
    const params = { locationName: ' Praia do Futuro ' };

    expect(renderPush('location.changed', { ...params, count: 1 }, locale)).toEqual({ title, body: one });
    expect(renderPush('location.changed', { ...params, count: 3 }, locale)).toEqual({ title, body: many });
    expect(renderPush('location.changed', params, locale).body).toBe(one);
  });

  it('shows the start in Fortaleza even when it falls on the previous or next UTC day', () => {
    expect(renderPush('class.edited', { discipline: 'surf', startsAt: '2026-10-19T01:30:00.000Z' }, 'pt-BR').body).toBe(
      'A aula de Surf de 18/10 às 22:30 foi alterada. Abra o app para ver.',
    );
    expect(renderPush('class.edited', { discipline: 'surf', startsAt: '2026-01-01T02:59:00.000Z' }, 'en').body).toBe(
      'Your Surf class on 12/31 at 23:59 was changed. Open the app to see it.',
    );
  });

  it('leaves the date blank when the start is missing or not a date', () => {
    expect(renderPush('class.edited', { discipline: 'surf' }, 'pt-BR').body).toBe(
      'A aula de Surf de  às  foi alterada. Abra o app para ver.',
    );
    expect(renderPush('class.unassigned', { discipline: 'surf', startsAt: 'nope' }, 'en').body).toBe(
      "You're no longer teaching the Surf class on  at .",
    );
  });

  it.each([
    ['pt-BR', 'Novo pedido de vaga', 'Ana Souza pediu vaga na aula de Surf de 18/10 às 08:00.'],
    ['es', 'Nueva solicitud de plaza', 'Ana Souza pidió plaza en la clase de Surf del 18/10 a las 08:00.'],
    ['en', 'New seat request', 'Ana Souza requested a seat in the Surf class on 10/18 at 08:00.'],
  ] as const)('writes the new seat request in %s', (locale, title, body) => {
    const params = { classId: 'c-1', studentName: ' Ana Souza ', discipline: 'surf', startsAt: STARTS_AT };

    expect(renderPush('enrolment.requested', params, locale)).toEqual({ title, body });
  });

  it.each([
    ['pt-BR', 'Você não conseguiu vaga', 'A aula de Skate de 18/10 às 08:00 começou sem vaga para o seu pedido.'],
    ['es', 'No conseguiste plaza', 'La clase de Skate del 18/10 a las 08:00 empezó sin plaza para tu solicitud.'],
    ['en', "You didn't get a seat", 'The Skate class on 10/18 at 08:00 started without a seat for your request.'],
  ] as const)('writes the expired request in %s', (locale, title, body) => {
    const params = { classId: 'c-1', discipline: 'skate', startsAt: STARTS_AT };

    expect(renderPush('enrolment.expired', params, locale)).toEqual({ title, body });
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
