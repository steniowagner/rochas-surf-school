import type { Messages } from "./en-US";

const messages: Messages = {
  language: {
    button: "Idioma",
    title: "Idioma",
    description: "Elige el idioma de la app.",
  },
  common: {
    cancel: "Cancelar",
    close: "Cerrar",
    back: "Volver",
  },
  auth: {
    continueWithApple: "Continuar con Apple",
    continueWithGoogle: "Continuar con Google",
    continueWithEmail: "Continuar con email",
    terms:
      "Al continuar, aceptas nuestros <terms>Términos de uso</terms> y la <privacy>Política de privacidad</privacy>.",
  },
  googleSignIn: {
    tokenInvalid: "No pudimos iniciar sesión con Google. Inténtalo de nuevo.",
    emailNotVerified:
      "Tu correo de Google no está verificado. Usa otro método para iniciar sesión.",
    playServices: "Google Play Services no está disponible en este teléfono.",
  },
  googleName: {
    title: "¿Cómo te llamas?",
    description:
      "Escribe tu nombre completo para que la escuela sepa quién eres.",
    submit: "Continuar",
  },
  createAccount: {
    title: "Crear cuenta",
    subtitle:
      "Dinos tu nombre y correo. Te enviaremos un código para confirmar.",
    namePlaceholder: "Nombre y apellido",
    emailPlaceholder: "tu@correo.com",
    submit: "Recibir código",
    nameInvalid: "Escribe tu nombre y apellido.",
    emailInvalid: "Escribe un correo válido.",
    errors: {
      invalidEmail:
        "Ese correo no parece válido. Revísalo e inténtalo de nuevo.",
      tooManyAttempts:
        "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
      sendFailed: "No pudimos enviar el correo. Inténtalo de nuevo.",
      noConnection: "Sin conexión. Revisa tu internet e inténtalo de nuevo.",
      generic: "Algo salió mal. Inténtalo de nuevo.",
    },
  },
  emailChoice: {
    title: "Continuar con email",
    subtitle: "¿Ya tienes cuenta en Rocha's o es tu primera vez?",
    existing: {
      title: "Ya tengo cuenta",
      description: "Entra con el correo con el que te registraste.",
    },
    new: {
      title: "Es mi primera vez",
      description: "Crea tu cuenta con tu nombre y correo.",
    },
  },
  emailSignIn: {
    title: "Entrar",
    subtitle:
      "Usa el correo de tu cuenta. Te enviaremos un código para entrar.",
    emailPlaceholder: "tu@correo.com",
    emailInvalid: "Escribe un correo válido.",
    noAccount: "¿Aún no tienes cuenta? <create>Crear cuenta</create>",
    submit: "Recibir código",
  },
  confirmCode: {
    title: "Confirma tu correo",
    description:
      "Enviamos un código de 6 dígitos a <bold>{{email}}</bold>. Caduca en 10 minutos.",
    inputLabel: "Código de 6 dígitos",
    submit: "Confirmar",
    resend: "Reenviar código",
    resendIn: "Reenviar código en {{time}}",
    notReceived:
      "¿No te llegó? Revisa la carpeta de spam o <change>cambia el correo</change>.",
    errors: {
      wrongCode: "Código incorrecto. Inténtalo de nuevo.",
      expired: "Este código caducó. Pide uno nuevo.",
      locked: "Demasiados intentos fallidos. Pide un código nuevo.",
      nameNotSaved: "No pudimos guardar tu nombre. Vuelve y revísalo.",
      noAccount:
        "No encontramos una cuenta con este correo. Crea una para continuar.",
    },
  },
  pending: {
    eyebrow: "Cuenta creada",
    title: "Esperando aprobación",
    description:
      "El equipo de Rocha's revisará tu registro. Cuando sea aprobado, podrás entrar con <bold>{{email}}</bold>.",
    steps: {
      created: "Cuenta creada",
      approval: "Aprobación del equipo",
      inReview: "En revisión",
      bookClasses: "Reservar clases",
    },
    now: "Ahora",
    signOut: "Cerrar sesión",
  },
  whatsapp: {
    eyebrow: "Cuenta aprobada",
    title: "Te damos la bienvenida a Rocha's, {{firstName}}",
    description: "Solo falta una cosa antes de empezar.",
    cardTitle: "Número de WhatsApp",
    helper:
      "Solo te pedimos el número para que la escuela pueda contactarte si hace falta; por ejemplo, si se cancela una clase por el estado del mar.",
    hideNumber: "Ocultar mi número",
    hideNumberHint:
      "Solo lo verán los administradores de la escuela. Puedes cambiarlo en tu perfil.",
    submit: "Guardar y continuar",
    pickerTitle: "País",
    pickerSearch: "Buscar país",
    invalidNumber: "Número de WhatsApp no válido.",
  },
  session: {
    expired: "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  },
  schoolRules: {
    eyebrow: "Último paso",
    title: "Normas de la escuela",
    description:
      "Pocas y sencillas — para que las clases salgan bien para todos.",
    accept:
      "He leído y acepto las normas y los términos de Rocha's Surf School.",
    submit: "Entrar en la app",
    empty: "La escuela todavía no tiene normas.",
    loadError: "No se pudieron cargar las normas.",
    outdated: "Las normas cambiaron. Léelas de nuevo y acéptalas.",
    retry: "Intentar de nuevo",
  },
  rulesUpdate: {
    eyebrow: "Normas actualizadas",
    title: "Normas de la escuela",
    description:
      "Actualizamos las normas de la escuela. Léelas y acéptalas para seguir usando la app.",
    submit: "Aceptar y continuar",
  },
  closedAccount: {
    useAnotherEmail: "Usar otro email",
    contactSchool: "Hablar con la escuela",
    whatsappUnavailable: "No se pudo abrir WhatsApp.",
  },
  denied: {
    eyebrow: "Registro no aprobado",
    title: "Esta vez no ha sido posible",
    description:
      "El equipo de Rocha's no aprobó el registro de <bold>{{email}}</bold>. Si crees que es un error, habla con nosotros.",
    noteTitle: "Mensaje del equipo",
  },
  removed: {
    eyebrow: "Acceso eliminado",
    title: "Ya no tienes acceso a la app",
    description:
      "El equipo de Rocha's eliminó el acceso de <bold>{{email}}</bold>. Esta cuenta no se puede reactivar desde la app.",
    noteTitle: "¿Tienes dudas?",
    noteText: "Habla directamente con la escuela por WhatsApp.",
  },
  reactivation: {
    notRequested: {
      eyebrow: "Cuenta eliminada",
      title: "Esta cuenta ya no está activa",
      description:
        "La cuenta de <bold>{{email}}</bold> fue eliminada. Para volver a usarla, pide al equipo de Rocha's que la reactive.",
      noteTitle: "Cómo reactivarla",
      noteText:
        "Toca «Pedir reactivación». El equipo recibe la solicitud y decide. Vuelve a entrar con este email para ver la respuesta.",
      request: "Pedir reactivación",
    },
    requested: {
      eyebrow: "Solicitud enviada",
      title: "El equipo la revisará",
      description:
        "Recibimos tu solicitud para reactivar <bold>{{email}}</bold>.",
      noteTitle: "¿Y ahora?",
      noteText:
        "Cuando el equipo responda, vuelve a entrar con este email para ver la respuesta.",
    },
    denied: {
      eyebrow: "Solicitud rechazada",
      title: "No fue posible reactivarla",
      description:
        "El equipo de Rocha's rechazó la solicitud para reactivar <bold>{{email}}</bold>. Esta cuenta seguirá inactiva.",
    },
    accountChanged: "Tu cuenta cambió. Vuelve a entrar para continuar.",
  },
  admin: {
    home: {
      toolsSection: "Herramientas",
      schoolSection: "Escuela",
      title: "Herramientas de la escuela",
      registrationsRow: "Unirse a la escuela",
      newClassRow: "Crear clases",
      waiting: "{{count}} esperando",
    },
  },
  instructor: {
    home: {
      title: "Panel",
    },
  },
  home: {
    peopleRow: "Personas",
  },
  registrations: {
    title: "Unirse a la escuela",
    description: "Personas esperando la aprobación de la escuela.",
    asked: "Pidió {{time}}",
    askedNow: "Pidió ahora",
    approve: "Aprobar",
    deny: "Rechazar",
    empty: "Nadie esperando para unirse.",
    loadError: "No se pudieron cargar los registros.",
    retry: "Reintentar",
    alreadyDecided: "Este registro ya fue decidido.",
    denySheet: {
      title: "¿Rechazar a {{name}}?",
      hint: "El motivo es opcional y se le mostrará a la persona.",
      label: "Motivo (opcional)",
      confirm: "Rechazar registro",
    },
  },
  decision: {
    decidedJustNow: "Decididos ahora",
    approved: "Aprobado",
    denied: "Rechazado",
  },
  flows: {
    onboarding: "Primeros pasos",
    student: "Alumno",
    instructor: "Instructor",
    admin: "Administrador",
  },
  themeSheet: {
    title: "Tema",
    description: "Hasta que elijas, la app sigue el tema del teléfono.",
  },
  theme: {
    system: "Igual que el teléfono",
    light: "Claro",
    dark: "Oscuro",
  },
  profile: {
    role: {
      student: "Alumno",
      instructor: "Instructor",
      admin: "Admin",
    },
    editProfile: "Editar perfil",
    whatsapp: "WhatsApp",
    whatsappVisible: "Visible",
    whatsappHidden: "Oculto",
    theme: "Tema",
    language: "Idioma",
    push: "Notificaciones push",
    pushNote: "Los avisos siempre quedan en la app. Aquí solo eliges si también llegan a tu teléfono.",
    pushDenied: "Permite las notificaciones de la app en los ajustes del teléfono.",
    schoolRules: "Reglas de la escuela",
    cancellationRules: "Reglas de cancelación",
    about: "Acerca de la app",
    privacyPolicy: "Política de privacidad",
    termsOfUse: "Términos de uso",
    removeAccount: "Eliminar la cuenta",
    signOut: "Cerrar sesión",
    comingSoon: "Próximamente.",
  },
  tabs: {
    agenda: "Agenda",
    myClasses: "Mis clases",
    school: "Escuela",
    home: "Inicio",
    classes: "Clases",
    profile: "Perfil",
  },
  editProfile: {
    title: "Editar perfil",
    nameLabel: "Nombre",
    emailLabel: "Correo electrónico",
    emailHint: "Tu correo no se puede cambiar.",
    changePhoto: "Cambiar foto de perfil",
    save: "Guardar",
  },
  profileWhatsapp: {
    title: "WhatsApp",
    description: "Los admins siempre ven tu número. Elige si alumnos e instructores también pueden verlo.",
    save: "Guardar",
  },
  schoolRulesScreen: {
    title: "Reglas de la escuela",
    description: "Pocas y sencillas, para que las clases salgan bien para todos.",
  },
  signOutSheet: {
    title: "¿Cerrar sesión?",
    description: "Para volver, solo inicia sesión otra vez con la misma cuenta.",
    confirm: "Cerrar sesión",
    cancel: "Cancelar",
  },
  about: {
    version: "Versión {{version}}",
    description: "Proyecto personal para sacar la reserva de clases de los grupos de WhatsApp: agenda de la semana, solicitudes de plaza y avisos en un solo lugar.",
    creatorRole: "Diseño y desarrollo",
    repository: "Repositorio de la app",
    creatorGithub: "GitHub del creador",
    creatorLinkedin: "LinkedIn del creador",
    close: "Cerrar",
  },
  people: {
    title: "Personas",
    count: "{{count}} en la plataforma",
    searchPlaceholder: "Buscar persona",
    filter: {
      student: "Alumnos",
      instructor: "Instructores",
      admin: "Admins",
    },
    since: "desde {{date}}",
    empty: "No se encontró a nadie",
    loadError: "No se pudo cargar a las personas.",
    whatsapp: "Chatear por WhatsApp",
    whatsappNotShared: "Número no compartido.",
    whatsappUnavailable: "No se pudo abrir WhatsApp.",
  },
  deleteAccountSheet: {
    title: "¿Eliminar tu cuenta?",
    description: "Tu cuenta se cierra ahora y se cancelan tus plazas y solicitudes futuras. Puedes pedir la reactivación en un plazo de 30 días.",
    confirm: "Eliminar cuenta",
    cancel: "Cancelar",
  },
  newClass: {
    title: "Nueva clase",
    discipline: {
      label: "Modalidad",
      surf: "Surf",
      skate: "Skate",
    },
    level: {
      label: "Nivel",
      hint: "solo informativo",
      beginner: "Principiante",
      advanced: "Avanzado",
      expert: "Experto",
    },
    days: {
      label: "Días",
      count_one: "1 día",
      count_other: "{{count}} días",
      pickOne: "elige al menos 1",
    },
    calendar: {
      start: "Toca un día para empezar",
      pickEnd: "{{date}} · toca otro día para un rango",
      clear: "Borrar",
      previousMonth: "Mes anterior",
      nextMonth: "Mes siguiente",
    },
    range: {
      excluded: "Días quitados",
      noneExcluded: "Ningún día quitado",
      description:
        "Toca un día del rango para quitarlo. Tócalo de nuevo para incluirlo.",
    },
    timeRanges: {
      label: "Horarios",
      pickOne: "elige al menos 1",
      hint: "Sugeridos a partir de las clases de la semana pasada.",
      hintPast: "Los horarios que ya pasaron no tendrán clase hoy.",
      hintOverlap: "Los horarios superpuestos no pueden ir en el mismo lote.",
      add: "Nuevo horario",
    },
    location: {
      label: "Lugar",
      pickOne: "elige un lugar",
      add: "Nuevo lugar",
    },
    capacity: {
      label: "Capacidad máxima",
      unit: "alumnos por clase",
      decrease: "Disminuir",
      increase: "Aumentar",
    },
    notes: {
      label: "Notas",
      optional: "opcional",
      placeholder: "Ej.: Punto de encuentro frente a la caseta del socorrista. Trae protector solar.",
    },
    instructors: {
      label: "Instructores",
      pickOne: "al menos 1",
      loadError: "No se pudo cargar a los instructores.",
    },
    summary: {
      days_one: "1 día",
      days_other: "{{count}} días",
      times_one: "1 horario",
      times_other: "{{count}} horarios",
      line: "{{days}} × {{times}} · {{location}}",
    },
    submit_one: "Crear clase",
    submit_other: "Crear {{count}} clases",
    tooMany: "Máximo de {{max}} clases por vez.",
    created_one: "Clase creada",
    created_other: "{{count}} clases creadas",
    errors: {
      past: "Uno de los horarios ya pasó. Revisa las fechas y los horarios.",
      instructors: "Uno de los instructores ya no puede dar clases.",
      location: "El lugar elegido ya no existe.",
    },
  },
  timeRangeSheet: {
    title: "Nuevo horario",
    description: "Define la hora de inicio y de fin. Vale solo para este lote: no queda en las sugerencias.",
    start: "Inicio",
    end: "Fin",
    endBeforeStart: "El fin debe ser después del inicio.",
    submit: "Añadir horario",
  },
  locationSheet: {
    title: "Nuevo lugar",
    description: "Los alumnos ven el nombre y la dirección.",
    name: "Nombre",
    namePlaceholder: "Ej.: Praia do Futuro",
    address: "Dirección",
    addressPlaceholder: "Ej.: Av. Zezé Diogo, 5000 – Fortaleza",
    duplicate: "Ya existe un lugar con este nombre.",
    submit: "Guardar lugar",
  },
};

export default messages;
