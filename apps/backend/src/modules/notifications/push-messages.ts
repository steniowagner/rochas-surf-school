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

const classCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 1;

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
    },
    es: {
      title: 'Inscripción rechazada',
      body: ({ reason }) => text(reason) || 'Abre la app para saber más.',
    },
    en: {
      title: 'Registration denied',
      body: ({ reason }) => text(reason) || 'Open the app to learn more.',
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
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `A aula de ${disciplineName(discipline)} de ${day} às ${time} foi alterada. Abra o app para ver.`;
      },
    },
    es: {
      title: 'Clase modificada',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt);
        return `La clase de ${disciplineName(discipline)} del ${day} a las ${time} cambió. Abre la app para verla.`;
      },
    },
    en: {
      title: 'Class changed',
      body: ({ discipline, startsAt }) => {
        const { day, time } = startParts(startsAt, true);
        return `Your ${disciplineName(discipline)} class on ${day} at ${time} was changed. Open the app to see it.`;
      },
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
