import type { Dictionary } from "../dictionary.types";

export const es = {
  site: {
    name: "Rocha's Surf School",
    description: "Clases de surf y skate de Rocha's Surf School",
  },
  header: {
    homeLabel: "Página de inicio",
    languageLabel: "Idioma",
  },
  footer: {
    text: "Rocha's Surf School",
  },
  home: {
    title: "Clases de surf y skate",
    description: "Aquí encontrarás la información pública de la app de Rocha's Surf School: cómo cuidamos tus datos y cómo eliminar tu cuenta.",
    privacyPolicy: {
      title: "Política de privacidad",
      description: "Qué datos recopila la app, por qué y por cuánto tiempo.",
    },
    accountDeletion: {
      title: "Eliminación de cuenta",
      description: "Cómo eliminar tu cuenta y qué pasa con tus datos.",
    },
  },
  privacyPolicy: {
    metaTitle: "Política de privacidad",
    metaDescription: "Qué datos recopila la app de Rocha's Surf School, por qué, por cuánto tiempo y quién los trata.",
    title: "Política de privacidad",
    description: "Esta política explica qué datos recopila la app de Rocha's Surf School, para qué, por cuánto tiempo los guardamos y qué servicios los tratan.",
    lastUpdatedLabel: "Última actualización",
    lastUpdated: "12 de octubre de 2026",
    collected: {
      title: "Qué recopilamos",
      intro: "Recopilamos solo lo que la app necesita para funcionar:",
      items: [
        "Tu nombre, correo electrónico y foto.",
        "Tu número de WhatsApp, y si aceptas mostrarlo a otras personas de la escuela.",
        "Las identidades de acceso: la cuenta de Google o Apple con la que entras, o el correo del código de acceso.",
        "Tus solicitudes de clase y tu asistencia a las clases.",
        "Las calificaciones (estrellas) y los comentarios que escribes sobre las clases.",
        "Las fotos de las clases en las que apareces o que subes.",
        "El token de notificaciones push de tu dispositivo.",
        "El idioma que elegiste.",
      ],
    },
    purposes: {
      title: "Para qué los usamos",
      items: [
        "crear y mantener tu cuenta y permitir que la escuela apruebe tu registro;",
        "organizar las clases, las solicitudes de cupo y la asistencia;",
        "enviar avisos sobre el registro, las clases y recordatorios por la app y por notificaciones push;",
        "mostrar calificaciones y comentarios para mejorar las clases;",
        "mostrar la app en tu idioma;",
        "hablar contigo por WhatsApp cuando sea necesario.",
      ],
    },
    retention: {
      title: "Por cuánto tiempo los guardamos",
      items: [
        "Mientras tu cuenta exista, guardamos sus datos.",
        "Cuenta eliminada: borramos tus datos personales 30 días después de la eliminación. En ese plazo puedes pedir que se reactive.",
        "Cuenta removida por la escuela: borramos los datos personales 30 días después de la remoción.",
        "Registro denegado: borramos todo 30 días después de la negativa.",
        "Datos de invitados en una clase: se borran 30 días después de la clase.",
        "Al borrar, el historial de la escuela queda sin tu nombre: las calificaciones en estrellas, las clases y las fotos permanecen, y la persona aparece como \"Exalumno\" o \"Exinstructor\".",
      ],
    },
    services: {
      title: "Quién trata los datos",
      intro: "Usamos estos servicios para que la app funcione:",
      items: [
        "Google: inicio de sesión con la cuenta de Google y Google Maps para mostrar el lugar de las clases.",
        "Apple: inicio de sesión con la cuenta de Apple.",
        "Resend: envía el correo con el código de acceso (recibe tu correo y el código).",
        "Expo: entrega las notificaciones push (recibe el token del dispositivo y el texto de la notificación).",
        "Un servicio de alojamiento en la nube, donde están la app y la base de datos.",
        "Un servicio de modelo de lenguaje (IA), que recibe solo los detalles de la clase y el texto de la regla de cancelación, nunca datos personales.",
        "Un servicio de almacenamiento de fotos compatible con S3, donde se guardan las fotos de las clases.",
      ],
    },
    rights: {
      title: "Tus derechos",
      text: "Puedes pedir acceso, corrección o eliminación de tus datos cuando quieras. Para eliminar tu cuenta, mira la página de eliminación de cuenta o habla con la escuela.",
      deletionLink: "Cómo eliminar tu cuenta",
    },
    site: {
      title: "Este sitio",
      text: "Este sitio no usa cookies, ni tiene rastreo ni análisis de visitas.",
    },
    controller: {
      title: "Quién es el responsable",
      text: "Rocha's Surf School es la responsable de tus datos. Para cualquier duda sobre privacidad, habla con la escuela:",
      contactLabel: "WhatsApp",
    },
  },
} satisfies Dictionary;
