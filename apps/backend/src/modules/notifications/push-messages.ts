import type {
  NotificationParams,
  NotificationType,
  PushLocale,
} from '@rochas-surf-school/notifications';

export interface PushText {
  title: string;
  body: string;
}

interface PushCopy {
  title: string | ((params: NotificationParams) => string);
  body: (params: NotificationParams) => string;
  /** The body on the app's notifications screen, when it differs from the push's (no "open the app" there). */
  inAppBody?: (params: NotificationParams) => string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const DISCIPLINE_NAMES: Record<string, string> = { surf: 'Surf', skate: 'Skate' };

const disciplineName = (value: unknown): string =>
  typeof value === 'string' ? (DISCIPLINE_NAMES[value] ?? '') : '';

// America/Fortaleza is UTC-3 all year (no daylight saving since 2019). Formatted by hand so the text never depends on
// the machine's locale data.
const FORTALEZA_OFFSET_MS = -3 * 60 * 60 * 1000;

const pad = (value: number): string => String(value).padStart(2, '0');

/** The class start as `{ day, time }` in Fortaleza (`dd/MM` or `MM/dd`, and `HH:mm`), blank when it isn't a date. */
const startParts = (value: unknown, monthFirst = false): { day: string; time: string } => {
  const date = new Date(typeof value === 'string' ? value : NaN);
  if (Number.isNaN(date.getTime())) {
    return { day: '', time: '' };
  }
  const local = new Date(date.getTime() + FORTALEZA_OFFSET_MS);
  const day = pad(local.getUTCDate());
  const month = pad(local.getUTCMonth() + 1);
  return {
    day: monthFirst ? `${month}/${day}` : `${day}/${month}`,
    time: `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
  };
};

const waitingCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;

const classCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 1;

/** The sentence of `class.edited` that the push and the app share. */
const classEdited: Record<PushLocale, (params: NotificationParams) => string> = {
  'pt-BR': ({ discipline, startsAt }) => {
    const { day, time } = startParts(startsAt);
    return `A aula de ${disciplineName(discipline)} de ${day} às ${time} foi alterada.`;
  },
  es: ({ discipline, startsAt }) => {
    const { day, time } = startParts(startsAt);
    return `La clase de ${disciplineName(discipline)} del ${day} a las ${time} cambió.`;
  },
  en: ({ discipline, startsAt }) => {
    const { day, time } = startParts(startsAt, true);
    return `Your ${disciplineName(discipline)} class on ${day} at ${time} was changed.`;
  },
};

// The second user-facing text the backend writes (next to the sign-in email): a push is drawn by the OS, often with
// the app closed, so its text travels in the payload. The admin's denial reason is shown as written, never translated.
const CATALOG: Record<NotificationType, Record<PushLocale, PushCopy>> = {
  'registration.pending': {
    'pt-BR': {
      title: 'Nova inscrição',
      body: ({ name }) => `${text(name)} está aguardando aprovação.`,
    },
    es: {
      title: 'Nueva inscripción',
      body: ({ name }) => `${text(name)} está esperando aprobación.`,
    },
    en: {
      title: 'New registration',
      body: ({ name }) => `${text(name)} is waiting for approval.`,
    },
  },
  'registration.approved': {
    'pt-BR': {
      title: 'Conta aprovada',
      body: () => 'Você já pode começar a usar o app.',
    },
    es: {
      title: 'Cuenta aprobada',
      body: () => 'Ya puedes empezar a usar la app.',
    },
    en: {
      title: 'Account approved',
      body: () => 'You can start using the app now.',
    },
  },
  'registration.denied': {
    'pt-BR': {
      title: 'Inscrição recusada',
      body: ({ reason }) => text(reason) || 'Abra o app para saber mais.',
      inAppBody: ({ reason }) => text(reason),
    },
    es: {
      title: 'Inscripción rechazada',
      body: ({ reason }) => text(reason) || 'Abre la app para saber más.',
      inAppBody: ({ reason }) => text(reason),
    },
    en: {
      title: 'Registration denied',
      body: ({ reason }) => text(reason) || 'Open the app to learn more.',
      inAppBody: ({ reason }) => text(reason),
    },
  },
  'class.assigned': {
    'pt-BR': {
      title: 'Novas aulas na sua escala',
      body: ({ count, discipline }) =>
        classCount(count) === 1
          ? `Você foi escalado para 1 aula de ${disciplineName(discipline)}.`
          : `Você foi escalado para ${classCount(count)} aulas de ${disciplineName(discipline)}.`,
    },
    es: {
      title: 'Nuevas clases en tu agenda',
      body: ({ count, discipline }) =>
        classCount(count) === 1
          ? `Te asignaron 1 clase de ${disciplineName(discipline)}.`
          : `Te asignaron ${classCount(count)} clases de ${disciplineName(discipline)}.`,
    },
    en: {
      title: 'New classes on your schedule',
      body: ({ count, discipline }) =>
        classCount(count) === 1
          ? `You've been assigned 1 ${disciplineName(discipline)} class.`
          : `You've been assigned ${classCount(count)} ${disciplineName(discipline)} classes.`,
    },
  },
  'class.edited': {
    'pt-BR': {
      title: 'Aula alterada',
      body: (params) => `${classEdited['pt-BR'](params)} Abra o app para ver.`,
      inAppBody: (params) => classEdited['pt-BR'](params),
    },
    es: {
      title: 'Clase modificada',
      body: (params) => `${classEdited.es(params)} Abre la app para verla.`,
      inAppBody: (params) => classEdited.es(params),
    },
    en: {
      title: 'Class changed',
      body: (params) => `${classEdited.en(params)} Open the app to see it.`,
      inAppBody: (params) => classEdited.en(params),
    },
  },
  'class.unassigned': {
    'pt-BR': {
      title: 'Você saiu de uma aula',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `Você não dá mais a aula de ${disciplineName(discipline)} de ${day} às ${time}.`;
      },
    },
    es: {
      title: 'Saliste de una clase',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `Ya no das la clase de ${disciplineName(discipline)} del ${day} a las ${time}.`;
      },
    },
    en: {
      title: 'Removed from a class',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `You're no longer teaching the ${disciplineName(discipline)} class on ${day} at ${time}.`;
      },
    },
  },
  // The admin's message is shown as written (trimmed), never translated; without one the body only says which class.
  'class.cancelled': {
    'pt-BR': {
      title: 'Aula cancelada',
      body: ({ discipline, startsAt, message }) => {
        const { day, time } = startParts(startsAt);
        return text(message)
          ? `${disciplineName(discipline)}, ${day} às ${time}: ${text(message)}`
          : `A aula de ${disciplineName(discipline)} de ${day} às ${time} foi cancelada.`;
      },
    },
    es: {
      title: 'Clase cancelada',
      body: ({ discipline, startsAt, message }) => {
        const { day, time } = startParts(startsAt);
        return text(message)
          ? `${disciplineName(discipline)}, ${day} a las ${time}: ${text(message)}`
          : `La clase de ${disciplineName(discipline)} del ${day} a las ${time} fue cancelada.`;
      },
    },
    en: {
      title: 'Class cancelled',
      body: ({ discipline, startsAt, message }) => {
        const { day, time } = startParts(startsAt, true);
        return text(message)
          ? `${disciplineName(discipline)}, ${day} at ${time}: ${text(message)}`
          : `Your ${disciplineName(discipline)} class on ${day} at ${time} was cancelled.`;
      },
    },
  },
  // The class is gone, so the push carries no class to open: it only says which one was removed.
  'class.deleted': {
    'pt-BR': {
      title: 'Aula excluída',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `A aula de ${disciplineName(discipline)} de ${day} às ${time} foi excluída.`;
      },
    },
    es: {
      title: 'Clase eliminada',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `La clase de ${disciplineName(discipline)} del ${day} a las ${time} fue eliminada.`;
      },
    },
    en: {
      title: 'Class deleted',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `Your ${disciplineName(discipline)} class on ${day} at ${time} was deleted.`;
      },
    },
  },
  'class.noInstructor': {
    'pt-BR': {
      title: ({ count }) => (classCount(count) === 1 ? 'Aula sem instrutor' : 'Aulas sem instrutor'),
      body: ({ count, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return classCount(count) === 1
          ? `A aula de ${disciplineName(discipline)} de ${day} às ${time} ficou sem instrutor.`
          : `${classCount(count)} aulas ficaram sem instrutor. A próxima: ${disciplineName(discipline)}, ${day} às ${time}.`;
      },
    },
    es: {
      title: ({ count }) => (classCount(count) === 1 ? 'Clase sin instructor' : 'Clases sin instructor'),
      body: ({ count, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return classCount(count) === 1
          ? `La clase de ${disciplineName(discipline)} del ${day} a las ${time} se quedó sin instructor.`
          : `${classCount(count)} clases se quedaron sin instructor. La próxima: ${disciplineName(discipline)}, ${day} a las ${time}.`;
      },
    },
    en: {
      title: ({ count }) =>
        classCount(count) === 1 ? 'Class without an instructor' : 'Classes without an instructor',
      body: ({ count, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return classCount(count) === 1
          ? `The ${disciplineName(discipline)} class on ${day} at ${time} has no instructor now.`
          : `${classCount(count)} classes have no instructor now. The next one: ${disciplineName(discipline)}, ${day} at ${time}.`;
      },
    },
  },
  // No day: a class just after midnight is reminded the evening before. The location's name is shown as stored.
  'class.reminder': {
    'pt-BR': {
      title: 'Sua aula começa em breve',
      body: ({ discipline, startsAt, locationName }) =>
        `A aula de ${disciplineName(discipline)} começa às ${startParts(startsAt).time} · ${text(locationName)}.`,
    },
    es: {
      title: 'Tu clase empieza pronto',
      body: ({ discipline, startsAt, locationName }) =>
        `La clase de ${disciplineName(discipline)} empieza a las ${startParts(startsAt).time} · ${text(locationName)}.`,
    },
    en: {
      title: 'Your class starts soon',
      body: ({ discipline, startsAt, locationName }) =>
        `The ${disciplineName(discipline)} class starts at ${startParts(startsAt).time} · ${text(locationName)}.`,
    },
  },
  // The location's name is shown as stored; the push concerns several classes, so it carries no class to open.
  'location.changed': {
    'pt-BR': {
      title: 'Local de aula alterado',
      body: ({ count, locationName }) =>
        classCount(count) === 1
          ? `O local ${text(locationName)} mudou. Confira sua próxima aula lá.`
          : `O local ${text(locationName)} mudou. Confira suas ${classCount(count)} próximas aulas lá.`,
    },
    es: {
      title: 'Lugar de clase modificado',
      body: ({ count, locationName }) =>
        classCount(count) === 1
          ? `El lugar ${text(locationName)} cambió. Revisa tu próxima clase allí.`
          : `El lugar ${text(locationName)} cambió. Revisa tus ${classCount(count)} próximas clases allí.`,
    },
    en: {
      title: 'Class location changed',
      body: ({ count, locationName }) =>
        classCount(count) === 1
          ? `${text(locationName)} changed. Check your next class there.`
          : `${text(locationName)} changed. Check your ${classCount(count)} upcoming classes there.`,
    },
  },
  'enrolment.requested': {
    'pt-BR': {
      title: 'Novo pedido de vaga',
      body: ({ studentName, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `${text(studentName)} pediu vaga na aula de ${disciplineName(discipline)} de ${day} às ${time}.`;
      },
    },
    es: {
      title: 'Nueva solicitud de plaza',
      body: ({ studentName, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `${text(studentName)} pidió plaza en la clase de ${disciplineName(discipline)} del ${day} a las ${time}.`;
      },
    },
    en: {
      title: 'New seat request',
      body: ({ studentName, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `${text(studentName)} requested a seat in the ${disciplineName(discipline)} class on ${day} at ${time}.`;
      },
    },
  },
  'enrolment.expired': {
    'pt-BR': {
      title: 'Você não conseguiu vaga',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `A aula de ${disciplineName(discipline)} de ${day} às ${time} começou sem vaga para o seu pedido.`;
      },
    },
    es: {
      title: 'No conseguiste plaza',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `La clase de ${disciplineName(discipline)} del ${day} a las ${time} empezó sin plaza para tu solicitud.`;
      },
    },
    en: {
      title: "You didn't get a seat",
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `The ${disciplineName(discipline)} class on ${day} at ${time} started without a seat for your request.`;
      },
    },
  },
  'enrolment.approved': {
    'pt-BR': {
      title: 'Pedido aprovado',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `Sua vaga na aula de ${disciplineName(discipline)} de ${day} às ${time} está confirmada.`;
      },
    },
    es: {
      title: 'Solicitud aprobada',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `Tu plaza en la clase de ${disciplineName(discipline)} del ${day} a las ${time} está confirmada.`;
      },
    },
    en: {
      title: 'Request approved',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `Your seat in the ${disciplineName(discipline)} class on ${day} at ${time} is confirmed.`;
      },
    },
  },
  'enrolment.denied': {
    'pt-BR': {
      title: 'Pedido recusado',
      body: ({ reason, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return (
          text(reason) ||
          `A escola recusou seu pedido para a aula de ${disciplineName(discipline)} de ${day} às ${time}.`
        );
      },
    },
    es: {
      title: 'Solicitud rechazada',
      body: ({ reason, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return (
          text(reason) ||
          `La escuela rechazó tu solicitud para la clase de ${disciplineName(discipline)} del ${day} a las ${time}.`
        );
      },
    },
    en: {
      title: 'Request denied',
      body: ({ reason, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return (
          text(reason) ||
          `The school declined your request for the ${disciplineName(discipline)} class on ${day} at ${time}.`
        );
      },
    },
  },
  'enrolment.cancelled': {
    'pt-BR': {
      title: 'Vaga cancelada',
      body: ({ studentName, discipline, startsAt, waitingCount: waiting }) => {
        const { day, time } = startParts(startsAt);
        const count = waitingCount(waiting);
        return `${text(studentName)} cancelou a vaga na aula de ${disciplineName(discipline)} de ${day} às ${time}.${count > 0 ? ` ${count} na lista de espera.` : ''}`;
      },
    },
    es: {
      title: 'Plaza cancelada',
      body: ({ studentName, discipline, startsAt, waitingCount: waiting }) => {
        const { day, time } = startParts(startsAt);
        const count = waitingCount(waiting);
        return `${text(studentName)} canceló su plaza en la clase de ${disciplineName(discipline)} del ${day} a las ${time}.${count > 0 ? ` ${count} en lista de espera.` : ''}`;
      },
    },
    en: {
      title: 'Seat cancelled',
      body: ({ studentName, discipline, startsAt, waitingCount: waiting }) => {
        const { day, time } = startParts(startsAt, true);
        const count = waitingCount(waiting);
        return `${text(studentName)} cancelled their seat in the ${disciplineName(discipline)} class on ${day} at ${time}.${count > 0 ? ` ${count} on the waiting list.` : ''}`;
      },
    },
  },
  'enrolment.enrolled': {
    'pt-BR': {
      title: 'Você foi inscrito',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `A escola inscreveu você na aula de ${disciplineName(discipline)} de ${day} às ${time}.`;
      },
    },
    es: {
      title: 'Te inscribieron',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `La escuela te inscribió en la clase de ${disciplineName(discipline)} del ${day} a las ${time}.`;
      },
    },
    en: {
      title: "You've been enrolled",
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `The school enrolled you in the ${disciplineName(discipline)} class on ${day} at ${time}.`;
      },
    },
  },
  'enrolment.takenOut': {
    'pt-BR': {
      title: 'Você foi retirado de uma aula',
      body: ({ reason, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return (
          text(reason) ||
          `A escola retirou você da aula de ${disciplineName(discipline)} de ${day} às ${time}.`
        );
      },
    },
    es: {
      title: 'Te retiraron de una clase',
      body: ({ reason, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return (
          text(reason) ||
          `La escuela te retiró de la clase de ${disciplineName(discipline)} del ${day} a las ${time}.`
        );
      },
    },
    en: {
      title: 'You were taken out of a class',
      body: ({ reason, discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return (
          text(reason) ||
          `The school took you out of the ${disciplineName(discipline)} class on ${day} at ${time}.`
        );
      },
    },
  },
};

export function renderPush(
  type: NotificationType,
  params: NotificationParams,
  locale: PushLocale,
): PushText {
  const copy = CATALOG[type][locale];
  const title = typeof copy.title === 'function' ? copy.title(params) : copy.title;
  return { title, body: copy.body(params) };
}

/**
 * The text of a notification on the app's notifications screen: the push's, minus the sentences that send the person
 * to the app they are already in (a `class.edited` ends after the change; a `registration.denied` without a reason has
 * an empty body).
 */
export function renderInApp(
  type: NotificationType,
  params: NotificationParams,
  locale: PushLocale,
): PushText {
  const { title, body } = renderPush(type, params, locale);
  const { inAppBody } = CATALOG[type][locale];
  return { title, body: inAppBody ? inAppBody(params) : body };
}
