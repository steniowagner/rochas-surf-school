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
    termsOfUse: {
      title: "Términos de uso",
      description: "Las reglas para usar la app y qué puedes publicar.",
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
    lastUpdated: "13 de octubre de 2026",
    controller: {
      title: "Quién es el responsable",
      text: "Rocha's Surf School es la responsable de tus datos. Para cualquier duda sobre privacidad, habla con la escuela.",
      legalNameLabel: "Razón social",
      cnpjLabel: "CNPJ",
      whatsappLabel: "WhatsApp",
    },
    dpo: {
      title: "Encargado de la protección de datos",
      text: "El encargado es el canal de comunicación entre tú, la escuela y la ANPD (Autoridad Nacional de Protección de Datos de Brasil).",
      nameLabel: "Nombre",
      emailLabel: "Correo electrónico",
    },
    collected: {
      title: "Qué recopilamos",
      intro: "Recopilamos solo lo que la app necesita para funcionar:",
      items: [
        "Tu nombre, correo electrónico y foto.",
        "Tu número de WhatsApp, y si aceptas mostrarlo a otras personas de la escuela.",
        "Tus identidades de acceso: la cuenta de Google o Apple con la que entras, o el correo que recibe el código de acceso.",
        "Tus solicitudes de lugar en clases y tu asistencia.",
        "Las calificaciones en estrellas y los comentarios que escribes sobre las clases.",
        "Fotos de clases en las que apareces o que subes.",
        "El token de notificaciones push de tu dispositivo.",
        "El idioma que elegiste.",
        "Datos de invitados: el nombre y el número de WhatsApp de una persona sin cuenta, que un administrador de la escuela ingresa para que pueda asistir a una clase.",
      ],
    },
    purposes: {
      title: "Para qué los usamos y con qué base legal",
      intro: "Cada uso de tus datos se apoya en una de las bases legales de la LGPD (Ley General de Protección de Datos de Brasil):",
      items: [
        "Crear y mantener tu cuenta, aprobar tu registro, organizar las clases y las solicitudes de lugar, registrar la asistencia, mostrar calificaciones y comentarios y enviar avisos en la app: ejecución de un contrato (LGPD, art. 7, V).",
        "Enviar notificaciones push a tu teléfono y mostrar tu número de WhatsApp a otras personas de la escuela, si así lo elegiste: tu consentimiento (LGPD, art. 7, I). Puedes retirarlo en cualquier momento en los ajustes del teléfono o de la app.",
        "Conservar las calificaciones en estrellas y el historial de clases de la escuela sin tu nombre después de que se borren tus datos, y guardar los datos de un invitado durante la clase a la que asiste: el interés legítimo de la escuela en mantener sus registros y dar sus clases (LGPD, art. 7, IX).",
      ],
    },
    services: {
      title: "Quién trata los datos",
      intro: "Usamos estos servicios para que la app funcione:",
      items: [
        "Google: inicio de sesión con una cuenta de Google y Google Maps para mostrar los lugares de las clases.",
        "Apple: inicio de sesión con una cuenta de Apple.",
        "Resend: envía el correo con el código de acceso (recibe tu correo y el código).",
        "Expo: entrega las notificaciones push (recibe el token del dispositivo y el texto de la notificación).",
        "Un servicio de alojamiento en la nube, donde funcionan la app y su base de datos.",
        "Un servicio de modelo de lenguaje (IA), que recibe solo los detalles de la clase y el texto de la regla de cancelación, nunca datos personales.",
        "Un servicio de almacenamiento de fotos compatible con S3, donde se guardan las fotos de las clases.",
      ],
    },
    transfers: {
      title: "Transferencias fuera de Brasil",
      text: "Estos servicios pueden tratar datos en otros países. Cuando ocurre, la transferencia sigue las garantías que permite la LGPD (art. 33), como las cláusulas contractuales y los compromisos de protección de datos de los propios proveedores.",
    },
    retention: {
      title: "Por cuánto tiempo los guardamos",
      intro: "Guardamos cada tipo de dato solo el tiempo necesario:",
      items: [
        "Códigos de acceso: 10 minutos.",
        "Tu sesión en un dispositivo: 30 días después del último uso de la app.",
        "El token push del dispositivo: hasta que cierres sesión en ese dispositivo o se borre la cuenta.",
        "Datos de la cuenta: mientras la cuenta exista.",
        "Cuenta eliminada: borramos tus datos personales 30 días después de la eliminación. En ese plazo puedes pedir la reactivación de la cuenta.",
        "Cuenta removida por la escuela: borramos los datos personales 30 días después de la remoción.",
        "Registro denegado: borramos todo 30 días después de la denegación.",
        "Nombre y WhatsApp de invitados: se borran 30 días después de que la clase termina o se cancela.",
        "Cuando se borran los datos, el historial de la escuela queda sin tu nombre: las calificaciones en estrellas permanecen sin nombre, y las clases y las fotos muestran \"Exalumno\" o \"Exinstructor\" en tu lugar.",
      ],
    },
    security: {
      title: "Cómo los protegemos",
      intro: "Protegemos tus datos con:",
      items: [
        "conexiones cifradas (HTTPS) entre la app y nuestros servidores;",
        "acceso limitado por perfil: cada persona ve solo lo que su perfil permite;",
        "inicio de sesión sin contraseña, con un código enviado a tu correo o con tu cuenta de Google o Apple.",
      ],
    },
    adults: {
      title: "Solo para mayores de edad",
      text: "La app es para personas de 18 años o más. No creamos cuentas para menores de edad. Si descubrimos que una cuenta pertenece a un menor, se elimina y se borran sus datos.",
    },
    rights: {
      title: "Tus derechos",
      intro: "Según la LGPD (art. 18), puedes pedir:",
      items: [
        "la confirmación de que tratamos tus datos;",
        "el acceso a tus datos;",
        "la corrección de datos incompletos, inexactos o desactualizados;",
        "la anonimización, el bloqueo o la eliminación de datos innecesarios o excesivos;",
        "la portabilidad de tus datos;",
        "la eliminación de los datos tratados con tu consentimiento;",
        "información sobre con quién compartimos tus datos;",
        "información sobre la posibilidad de no dar el consentimiento y sus consecuencias;",
        "la revocación de tu consentimiento.",
      ],
      howTo: "Para ejercer cualquiera de estos derechos, escribe al encargado, al correo de arriba, o habla con la escuela por WhatsApp.",
      complaint: "También puedes presentar una queja ante la ANPD (Autoridade Nacional de Proteção de Dados), la autoridad de protección de datos de Brasil.",
    },
    deletion: {
      title: "Eliminar tu cuenta",
      text: "Puedes eliminar tu cuenta en cualquier momento.",
      link: "Cómo eliminar tu cuenta",
    },
    terms: {
      title: "Términos de uso",
      text: "Las reglas para usar la app están en nuestros términos de uso.",
      link: "Leer los términos de uso",
    },
    site: {
      title: "Este sitio web",
      text: "Este sitio web no usa cookies y no tiene seguimiento ni analítica.",
    },
    changes: {
      title: "Cambios en esta política",
      text: "Cuando esta política cambie, publicaremos la nueva versión en esta página, con una nueva fecha de \"Última actualización\".",
    },
  },
  termsOfUse: {
    metaTitle: "Términos de uso",
    metaDescription: "Las reglas para usar la app de Rocha's Surf School: quién puede usarla, qué puedes publicar, cómo denunciar contenido y qué no cubren los términos.",
    title: "Términos de uso",
    description: "Estos términos explican cómo puedes usar la app de Rocha's Surf School.",
    lastUpdatedLabel: "Última actualización",
    lastUpdated: "13 de octubre de 2026",
    about: {
      title: "Sobre estos términos",
      text: "Estos términos se aplican a la app de Rocha's Surf School. Al usar la app, los aceptas.",
    },
    who: {
      title: "Quién puede usar la app",
      intro: "Para usar la app:",
      items: [
        "debes tener 18 años o más;",
        "tu registro debe ser aprobado por la escuela: toda cuenta se revisa antes de poder usarse;",
        "las decisiones de los administradores de la escuela en la app, como aprobaciones, denegaciones, perfiles y remociones, son definitivas;",
        "la escuela puede remover una cuenta que incumpla estos términos o las reglas de la escuela.",
      ],
    },
    rules: {
      title: "Reglas de la escuela",
      text: "Las reglas de la escuela que aceptas en la app también se aplican. Siguen rigiendo la conducta en la escuela, mientras que estos términos rigen el uso de la app.",
    },
    content: {
      title: "Qué publicas",
      intro: "Los comentarios y las fotos que publicas en la app deben respetar a las demás personas. Está prohibido:",
      items: [
        "el acoso y la intimidación;",
        "el discurso de odio;",
        "la desnudez y el contenido sexual;",
        "la violencia;",
        "el contenido ilegal;",
        "los datos privados de otras personas.",
      ],
      outro: "Los administradores borran el contenido que incumple estas reglas y pueden remover la cuenta que lo publicó.",
    },
    reporting: {
      title: "Denunciar contenido",
      text: "La app no tiene un botón de denuncia. Para denunciar un comentario, una foto o una persona, habla con la escuela por WhatsApp:",
    },
    payments: {
      title: "Pagos",
      text: "La app no recibe pagos.",
    },
    coverage: {
      title: "Qué no cubren estos términos",
      text: "Estos términos no son una renuncia de responsabilidad. Los riesgos del surf y del skate, y los pagos, se tratan en el acuerdo propio de la escuela con cada alumno.",
    },
    privacy: {
      title: "Privacidad",
      text: "Cómo tratamos tus datos y cómo eliminar tu cuenta se explican en estas páginas:",
      policyLink: "Política de privacidad",
      deletionLink: "Eliminación de cuenta",
    },
    changes: {
      title: "Cambios en estos términos",
      text: "Cuando estos términos cambien, publicaremos la nueva versión en esta página, con una nueva fecha de \"Última actualización\".",
    },
    law: {
      title: "Ley aplicable",
      text: "Estos términos se rigen por la ley brasileña.",
    },
  },
  accountDeletion: {
    metaTitle: "Eliminación de cuenta",
    metaDescription: "Cómo eliminar tu cuenta de Rocha's Surf School y qué pasa con tus datos.",
    title: "Eliminación de cuenta",
    description: "Mira cómo eliminar tu cuenta de Rocha's Surf School, qué se borra y qué queda sin tu nombre.",
    inApp: {
      title: "Si tienes la app",
      text: "Abre la app y ve a Perfil → Eliminar cuenta. Después, confirma la eliminación.",
    },
    noApp: {
      title: "Si ya no tienes la app",
      text: "Habla con la escuela por WhatsApp y pide la eliminación. Un administrador atiende el pedido removiendo tu cuenta.",
      numberLabel: "WhatsApp de la escuela",
      button: "Hablar con la escuela por WhatsApp",
    },
    erased: {
      title: "Qué se borra",
      intro: "Borramos tus datos personales:",
      items: [
        "nombre;",
        "correo electrónico;",
        "foto;",
        "número de WhatsApp;",
        "comentarios.",
      ],
    },
    kept: {
      title: "Qué queda sin tu nombre",
      intro: "El historial de la escuela continúa, sin identificarte:",
      items: [
        "las calificaciones en estrellas;",
        "las clases y las fotos, que muestran \"Exalumno\" o \"Exinstructor\" en lugar de la persona.",
      ],
    },
    timing: {
      title: "Cuándo",
      text: "Borramos estos datos 30 días después de la eliminación o de la remoción de la cuenta.",
    },
  },
} satisfies Dictionary;
