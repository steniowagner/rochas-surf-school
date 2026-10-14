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
  title: string;
  body: (params: NotificationParams) => string;
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const DISCIPLINE_NAMES: Record<string, string> = { surf: 'Surf', skate: 'Skate' };

const disciplineName = (value: unknown): string =>
  typeof value === 'string' ? (DISCIPLINE_NAMES[value] ?? '') : '';

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
};

export function renderPush(
  type: NotificationType,
  params: NotificationParams,
  locale: PushLocale,
): PushText {
  const copy = CATALOG[type][locale];
  return { title: copy.title, body: copy.body(params) };
}
