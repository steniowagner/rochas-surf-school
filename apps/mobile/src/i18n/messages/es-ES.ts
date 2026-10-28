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
    clear: "Borrar",
    tryAgain: "Intentar de nuevo",
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
      noteTitle: "Mensaje del equipo",
    },
    accountChanged: "Tu cuenta cambió. Vuelve a entrar para continuar.",
  },
  admin: {
    home: {
      toolsSection: "Herramientas",
      schoolSection: "Escuela",
      registrationsRow: "Unirse a la escuela",
      reactivationsRow: "Reactivar cuentas",
      classRequestsRow: "Inscripciones en clases",
      enrolStudentRow: "Inscribir alumno",
      classRequestsCount_one: "{{count}} solicitud",
      classRequestsCount_other: "{{count}} solicitudes",
      newClassRow: "Crear clases",
      cancellationRulesRow: "Reglas de cancelación",
      cancellationRulesSubtitle: "Una para surf, otra para skate",
      schoolSettingsRow: "Ajustes de la escuela",
      sendNoticeRow: "Enviar aviso",
      sendNoticeSubtitle: "A todos, alumnos o instructores",
      waiting: "{{count}} esperando",
      nothingPending: "Nada pendiente",
      enrolStudentSubtitle: "Alumnos de la escuela o clases de prueba",
      removedAccountsRow: "Cuentas quitadas",
      removedAccountsCount_one: "{{count}} cuenta",
      removedAccountsCount_other: "{{count}} cuentas",
      removedAccountsNone: "Ninguna cuenta quitada",
    },
  },
  reactivations: {
    title: "Reactivar cuentas",
    waiting: "{{count}} esperando respuesta",
    description:
      "Cuentas eliminadas que pidieron volver. Reactivar devuelve la cuenta, el historial y el rol, pero no las plazas canceladas. La persona recibe una notificación push.",
    details_one: "Eliminada el {{date}} · {{count}} clase",
    details_other: "Eliminada el {{date}} · {{count}} clases",
    approve: "Reactivar",
    deny: "Rechazar",
    empty: {
      title: "Ninguna solicitud",
      description:
        "Las solicitudes de cuentas eliminadas que quieren volver aparecen aquí.",
    },
    loadError: {
      title: "No se pudieron cargar las solicitudes",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    alreadyDecided: "Esta solicitud ya fue decidida.",
    denySheet: {
      title: "¿Rechazar la reactivación?",
      hint: "La cuenta de {{name}} seguirá eliminada. Puedes explicar el motivo (opcional): la persona recibe este mensaje.",
      label: "Motivo (opcional)",
      placeholder: "Escribe un mensaje para la persona.",
      confirm: "Rechazar y avisar",
    },
  },
  registrations: {
    title: "Unirse a la escuela",
    waiting: "{{count}} esperando aprobación",
    description:
      "Las cuentas nuevas solo pueden reservar clases después de ser aprobadas. La persona recibe una notificación push.",
    approve: "Aprobar",
    deny: "Rechazar",
    loading: "Cargando los registros",
    empty: {
      title: "Nadie esperando",
      description: "Las cuentas nuevas pendientes de aprobación aparecen aquí.",
    },
    loadError: {
      title: "No se pudieron cargar los registros",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    retry: "Reintentar",
    alreadyDecided: "Este registro ya fue decidido.",
    denySheet: {
      title: "¿Rechazar la entrada?",
      hint: "{{name}} no entrará en la escuela. Puedes explicar el motivo (opcional): la persona recibe este mensaje.",
      label: "Motivo (opcional)",
      placeholder: "Ej.: Por el momento no tenemos plazas para nuevos alumnos.",
      confirm: "Rechazar y avisar",
      back: "Volver",
    },
  },
  removedAccounts: {
    title: "Cuentas quitadas",
    count_one: "{{count}} se puede restaurar",
    count_other: "{{count}} se pueden restaurar",
    description:
      "Cuentas quitadas en los últimos 30 días. Al restaurar, la persona vuelve con los mismos datos y recibe una notificación push.",
    loading: "Cargando las cuentas quitadas",
    empty: {
      title: "Ninguna cuenta quitada",
      description: "Las cuentas que quites aparecen aquí durante 30 días, para poder restaurarlas.",
    },
    loadError: {
      title: "No se pudieron cargar las cuentas quitadas",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
  },
  classRequests: {
    title: "Inscripciones en clases",
    requestsCount_one: "{{count}} solicitud",
    requestsCount_other: "{{count}} solicitudes",
    classesCount_one: "{{count}} clase",
    classesCount_other: "{{count}} clases",
    maxStudents_one: "Máx. {{count}} alumno",
    maxStudents_other: "Máx. {{count}} alumnos",
    spotsLeft_one: "{{count}} plaza libre",
    spotsLeft_other: "{{count}} plazas libres",
    full: "Completa",
    waitingList: "Lista de espera · por orden de solicitud",
    fullNote:
      "Inscribir queda bloqueado mientras el grupo esté lleno. Aumenta el aforo o espera a que se libere una plaza.",
    position: "{{position}}º",
    askedAt: "Pidió a las {{time}} · {{date}}",
    approve: "Inscribir",
    deny: "Rechazar",
    approved: "{{name}} inscrito · alumno avisado",
    denied: "{{name}} rechazado · alumno avisado",
    description:
      "Alumnos que piden unirse a las clases, agrupados por clase. Inscribe o rechaza cada solicitud; el alumno recibe un aviso.",
    loading: "Cargando las solicitudes",
    empty: {
      title: "Nada en espera",
      description: "Todas las inscripciones fueron decididas.",
    },
    emptyFiltered: {
      surf: {
        title: "Sin solicitudes de surf",
        description: "No hay solicitudes pendientes en clases de surf.",
      },
      skate: {
        title: "Sin solicitudes de skate",
        description: "No hay solicitudes pendientes en clases de skate.",
      },
    },
    loadError: {
      title: "No se pudieron cargar las solicitudes",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    retry: "Reintentar",
    denySheet: {
      title: "¿Rechazar inscripción?",
      hint: "{{name}} no queda inscrito en esta clase. Puedes explicar el motivo (opcional): la persona recibe este mensaje.",
      label: "Motivo (opcional)",
      placeholder: "Ej.: Esta clase es de nivel avanzado.",
      confirm: "Rechazar y avisar",
      back: "Volver",
    },
    errors: {
      notPending: "Esta solicitud ya fue decidida.",
      started: "La clase ya empezó.",
      full: "El grupo se llenó.",
    },
  },
  enrolStudent: {
    title: "Inscribir alumno",
    students: {
      loading: "Cargando los alumnos",
      empty: {
        title: "Ningún alumno encontrado",
        description: "Prueba con otro nombre o revisa la ortografía.",
      },
      loadError: {
        title: "No se pudieron cargar los alumnos",
        description: "Comprueba tu conexión e inténtalo de nuevo.",
      },
    },
    classes: {
      loading: "Cargando las clases",
      empty: {
        title: "Sin clases este día",
        description: "No hay clases por empezar este día. Elige otro día.",
      },
      loadError: {
        title: "No se pudieron cargar las clases",
        description: "Comprueba tu conexión e inténtalo de nuevo.",
      },
    },
    searchPlaceholder: "Buscar alumno",
    searchLabel: "Buscar alumno",
    hasClasses: "con clases",
    steps: {
      who: "Quién",
      class: "Clase",
      pending: "Por elegir",
    },
    next: "Elegir clase",
    submitEmpty: "Inscribir",
    done: "{{name}} inscrito · alumno avisado",
    modeTrial: "Clase de prueba",
    modeStudent: "Alumno de la escuela",
    doneTrial: "{{name}} inscrito",
    trial: {
      nameLabel: "Nombre",
      namePlaceholder: "Ej.: Carolina Reis",
      invalidName: "Indica nombre y apellido.",
      whatsappLabel: "WhatsApp",
      note: "Esta clase no queda en el historial — si la persona crea una cuenta después, empieza de cero.",
    },
    errors: {
      alreadyApproved: "Este alumno ya está inscrito en esta clase.",
      full: "La clase se llenó.",
      started: "La clase ya empezó.",
      cancelled: "Esta clase fue cancelada.",
      invalidStudent: "Este alumno no se puede inscribir.",
      invalidGuest:
        "El nombre o el número de este alumno de prueba no es válido.",
    },
  },
  takeOutSheet: {
    title: "¿Retirar a {{name}} de la clase?",
    hint: "{{summary}}. La plaza queda libre. La persona recibe una notificación, con el motivo si lo escribes.",
    label: "Motivo (opcional)",
    placeholder: "Ej.: Este grupo es de nivel avanzado.",
    confirm: "Retirar de la clase",
    back: "Volver",
    action: "Retirar",
    done: "{{name}} retirado · alumno avisado",
    guestTitle: "¿Retirar a {{name}} de la clase?",
    guestHint:
      "{{summary}}. La plaza queda libre. Es un alumno de prueba, sin cuenta — avísale por WhatsApp.",
    guestDone: "{{name}} retirado",
    errors: {
      notApproved: "Esta plaza ya no está aprobada.",
      started: "La clase ya empezó.",
      guestNotFound: "Este alumno de prueba ya no está en la clase.",
    },
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
    pushNote:
      "Los avisos siempre quedan en la app. Aquí solo eliges si también llegan a tu teléfono.",
    pushDenied:
      "Permite las notificaciones de la app en los ajustes del teléfono.",
    schoolRules: "Reglas de la escuela",
    cancellationRules: "Reglas de cancelación",
    about: "Acerca de la app",
    privacyPolicy: "Política de privacidad",
    termsOfUse: "Términos de uso",
    removeAccount: "Eliminar la cuenta",
    signOut: "Cerrar sesión",
    comingSoon: "Próximamente.",
  },
  notices: {
    title: "Enviar aviso",
    description:
      "Escribe un título y un mensaje. Todos los del público lo reciben como notificación.",
    audience: {
      section: "Quién lo recibe",
      all: "Todos",
      students: "Alumnos",
      instructors: "Instructores",
    },
    count: {
      loading: "Cargando los destinatarios…",
      error: "No se pudo contar los destinatarios.",
      none: "Nadie para recibirlo.",
      people_one: "{{count}} persona lo recibirá",
      people_other: "{{count}} personas lo recibirán",
    },
    titleLabel: "Título",
    messageLabel: "Descripción",
    titlePlaceholder: "Ej.: Cambio de playa el sábado",
    messagePlaceholder: "Escribe el mensaje",
    send: "Enviar",
    sent: "Aviso enviado",
    sendError: "No se pudo enviar el aviso. Inténtalo de nuevo.",
    confirm: {
      title_one: "¿Enviar a {{count}} persona?",
      title_other: "¿Enviar a {{count}} personas?",
      description: {
        all: "Todos — alumnos, instructores y admins — reciben una notificación. Una vez enviado, no se puede borrar.",
        students:
          "Todos los alumnos reciben una notificación. Una vez enviado, no se puede borrar.",
        instructors:
          "Todos los instructores reciben una notificación. Una vez enviado, no se puede borrar.",
      },
      send: "Sí, enviar",
      cancel: "Volver y editar",
    },
    classMessage: {
      title: "Mensaje para la clase",
      receive_one: "{{count}} persona lo recibe",
      receive_other: "{{count}} personas lo reciben",
      summary: {
        instructors_one: "{{count}} instructor",
        instructors_other: "{{count}} instructores",
        students_one: "{{count}} alumno",
        students_other: "{{count}} alumnos",
        pending_one: "{{count}} solicitud pendiente",
        pending_other: "{{count}} solicitudes pendientes",
      },
      roles: { instructor: "Instructor", student: "Confirmado", pending: "Solicitud pendiente" },
      description:
        "Escribe un título y un mensaje. Los instructores y los alumnos de esta clase lo reciben como notificación.",
      count: {
        loading: "Cargando la clase…",
        error: "No se pudo cargar la clase.",
      },
      confirm:
        "Los instructores y los alumnos de {{classLine}} reciben una notificación. Una vez enviado, no se puede borrar.",
      sent: "Mensaje enviado",
      sendError: "No se pudo enviar el mensaje. Inténtalo de nuevo.",
      errors: {
        finished: "Esta clase ya terminó. El mensaje no se envió.",
        cancelled: "Esta clase fue cancelada. El mensaje no se envió.",
      },
    },
  },
  schoolSettings: {
    title: "Ajustes de la escuela",
    description:
      "Cómo piden cupo los alumnos en las clases llenas y cómo hablan con la escuela.",
    waitingList: {
      section: "Lista de espera",
      label: "Lista de espera en las clases llenas",
      on: "En una clase llena, los alumnos pueden entrar en la lista de espera. Si se libera un cupo, la solicitud pasa a tu aprobación.",
      off: "Desactivada — en una clase llena, los alumnos ven «Clase llena» y no pueden pedir.",
    },
    whatsapp: {
      section: "WhatsApp de la escuela",
      helper: "Es el número del botón «Hablar con la escuela».",
    },
    save: "Guardar",
    saved: "Ajustes guardados",
    loading: "Cargando los ajustes",
    loadError: {
      title: "No se pudieron cargar los ajustes",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
  },
  cancellationRules: {
    sheet: {
      title: "Reglas de cancelación",
      empty: "La escuela aún no ha escrito esta regla.",
      loadError: "No se pudieron cargar las reglas.",
      retry: "Intentar de nuevo",
      close: "Cerrar",
    },
    screen: {
      title: "Reglas de cancelación",
      intro:
        "Hay una regla para cada modalidad. La app lee la regla con los datos de la clase — nunca los de los alumnos — y calcula hasta cuándo se puede cancelar cada clase.",
      tipTime:
        'Indica plazos exactos en horas antes del inicio de la clase — nada de "a última hora".',
      tipAmbiguity:
        "Evita la ambigüedad: si una persona duda al leerla, la app también dudará.",
      placeholder:
        "Ej.: El alumno puede cancelar sin penalización hasta 12 horas antes del inicio de la clase…",
      save: "Guardar regla de {{discipline}}",
      saved: "Regla de {{discipline}} guardada",
      loading: "Cargando la regla",
      loadError: {
        title: "No se pudieron cargar las reglas",
        description: "Comprueba tu conexión e inténtalo de nuevo.",
      },
      discipline: { surf: "surf", skate: "skate" },
    },
  },
  myClasses: {
    title: "Mis clases",
    history: "Historial",
    filters: {
      all: "Todas",
      pending: "Pendientes",
      confirmed: "Confirmadas",
      ended: "Cerradas",
    },
    empty: {
      title: "Nada por aquí",
      all: "Todavía no has pedido plaza en ninguna clase.",
      filtered: "No tienes solicitudes con este estado.",
      allSport: "Todavía no has pedido plaza en ninguna clase de {{sport}}.",
      filteredSport: "No tienes solicitudes de {{sport}} con este estado.",
    },
    loading: "Cargando las clases",
    loadError: {
      title: "Algo salió mal",
      description:
        "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo.",
    },
  },
  myHistory: {
    title: "Clases pasadas",
    legend: "Días en que hiciste clase",
    hasClasses: "hiciste clase",
    allClasses: "Todas las clases",
    clearDay: "Quitar {{date}}",
    loading: "Cargando las clases",
    loadError: {
      title: "Algo salió mal",
      description:
        "No pudimos cargar tu historial. Revisa tu conexión e inténtalo de nuevo.",
    },
    emptyDay: {
      title: "Sin clases este día",
      description: "No hiciste ninguna clase este día.",
      descriptionSport: "No hiciste ninguna clase de {{sport}} este día.",
    },
    emptyPeriod: {
      title: "Sin clases en este período",
      description: "No hiciste ninguna clase en este período.",
      descriptionSport:
        "No hiciste ninguna clase de {{sport}} en este período.",
    },
  },
  teachingHistory: {
    description: "Todas las clases que ya diste, mes a mes o semana a semana.",
    title: "Clases pasadas",
    legend: "Días en que diste clase",
    hasClasses: "diste clase",
    allClasses: "Todas las clases",
    clearDay: "Quitar {{date}}",
    loading: "Cargando las clases",
    loadError: {
      title: "Algo salió mal",
      description:
        "No pudimos cargar tus clases pasadas. Revisa tu conexión e inténtalo de nuevo.",
    },
    emptyDay: {
      title: "Sin clases este día",
      description: "No diste ninguna clase este día.",
      descriptionSport: "No diste ninguna clase de {{sport}} este día.",
    },
    emptyPeriod: {
      title: "Sin clases en este período",
      description: "No diste ninguna clase en este período.",
      descriptionSport: "No diste ninguna clase de {{sport}} en este período.",
    },
  },
  userHeader: {
    greeting: {
      morning: "Buenos días,",
      afternoon: "Buenas tardes,",
      evening: "Buenas noches,",
    },
    notifications: "Notificaciones",
    notificationsUnread_one: "Notificaciones, {{count}} sin leer",
    notificationsUnread_other: "Notificaciones, {{count}} sin leer",
  },
  tabs: {
    agenda: "Agenda",
    myClasses: "Mis clases",
    school: "Escuela",
    home: "Inicio",
    panel: "Panel",
    classes: "Clases",
    people: "Personas",
    profile: "Perfil",
  },
  weekMonthCalendar: {
    showMonth: "Ver el mes",
    showWeek: "Ver la semana",
    previousWeek: "Ver la semana anterior",
    nextWeek: "Ver la semana siguiente",
    previousMonth: "Ver el mes anterior",
    nextMonth: "Ver el mes siguiente",
  },
  classes: {
    erased: {
      student: "Exalumno",
      instructor: "Exinstructor",
    },
  },
  classesWeek: {
    loading: "Cargando las clases",
    hasClasses: "con clases",
    disciplineFilter: {
      all: "Todas",
      surf: "Surf",
      skate: "Skate",
      open: "Filtrar por modalidad",
      close: "Cerrar filtro",
    },
    emptyDay: {
      title: "Sin clases este día",
      description: "Todavía no hay clases programadas para el {{date}}.",
    },
    create: "Crear clase",
    newClass: "Nueva clase",
    loadError: {
      title: "Algo salió mal",
      description:
        "No pudimos cargar las clases del {{date}}. Revisa tu conexión e inténtalo de nuevo.",
    },
    state: {
      started: "En curso",
      finished: "Finalizada",
    },
    cancelled: "Cancelada",
    noInstructor: "Sin instructor",
    noDeadline: "Sin plazo",
    occupancy: "{{taken}}/{{capacity}} plazas",
    full: "Completa",
    students: {
      none: "Aún sin alumnos",
      confirmed_one: "{{count}} alumno confirmado",
      confirmed_other: "{{count}} alumnos confirmados",
      present_one: "{{count}} alumno presente",
      present_other: "{{count}} alumnos presentes",
    },
  },
  classDetails: {
    title: "Detalle",
    today: "Hoy",
    tomorrow: "Mañana",
    yesterday: "Ayer",
    started: {
      title: "En curso",
      description: "Empezó a las {{start}} y termina a las {{end}}.",
    },
    finished: {
      title: "Clase finalizada",
      description: "Terminó a las {{end}}.",
    },
    cancelled: {
      title: "Clase cancelada",
      description: "Esta clase no se realizará.",
    },
    instructor_one: "Instructor",
    instructor_other: "Instructores",
    you: "Tú",
    capacity_one: "Máx. {{count}} alumno",
    capacity_other: "Máx. {{count}} alumnos",
    theClass: "La clase",
    spotsLeft_one: "{{count}} plaza libre",
    spotsLeft_other: "{{count}} plazas libres",
    soldOut: "agotado",
    guestsWarning_one:
      "1 alumno de prueba no tiene cuenta y no recibe el aviso — habla con él por WhatsApp.",
    guestsWarning_other:
      "{{count}} alumnos de prueba no tienen cuenta y no reciben el aviso — habla con ellos por WhatsApp.",
    trialChip: "Trial",
    includesTrial_one: "incluye {{count}} de prueba",
    includesTrial_other: "incluye {{count}} de prueba",
    full: {
      title: "Clase llena",
      waitingList: "Puedes entrar en la lista de espera.",
      waitingListClosed: "La lista de espera está cerrada para esta clase.",
      newRequestsWait: "Las nuevas solicitudes entran en la lista de espera.",
      waitingListOff:
        "La lista de espera está desactivada — nadie puede pedir.",
    },
    rules: {
      title: "Reglas",
      cancellation: "Cancelación",
      until: "Hasta {{when}}",
      read: "Leer la regla",
      school: "Reglas de la escuela",
      schoolCount_one: "{{count}} regla para todos los alumnos",
      schoolCount_other: "{{count}} reglas para todos los alumnos",
    },
    readOnly: {
      teaches:
        "Las inscripciones, cancelaciones y cambios de horario las hace la escuela",
      notAssigned:
        "No estás asignado a esta clase: lo ves todo en modo de solo lectura",
    },
    notes: "Notas",
    location: "Dónde y cómo",
    directions: "Cómo llegar",
    directionsUnavailable: "No se pudo abrir el mapa.",
    loadError: "No se pudo cargar la clase.",
    notFound: "Esta clase ya no existe.",
    retry: "Intentar de nuevo",
    loading: "Cargando la clase",
    errorState: {
      title: "Algo salió mal",
      description:
        "No pudimos cargar esta clase. Revisa tu conexión e inténtalo de nuevo.",
    },
    notFoundState: {
      title: "Clase no encontrada",
      description: "Esta clase fue eliminada o ya no existe.",
    },
    noInstructor: {
      title: "Sin instructor",
      description: "Asigna un instructor antes de la clase.",
    },
    noInstructorAssigned: "Sin instructor asignado",
    noDeadline: {
      title: "Sin plazo de cancelación",
      description:
        "Todavía no hemos podido calcular hasta cuándo pueden cancelar los alumnos. Revisa la regla de {{discipline}}.",
    },
    tools: "Herramientas de la clase",
  },
  enrolment: {
    status: {
      pending: {
        chip: "Pendiente",
        title: "Solicitud pendiente",
        description: "Tu solicitud espera la aprobación de la escuela.",
      },
      waitingList: {
        chip: "En lista de espera",
        title: "Estás en la lista de espera",
        description:
          "Si se libera una plaza, tu solicitud pasa a la aprobación de la escuela.",
      },
      approved: {
        chip: "Aprobado",
        title: "Estás inscrito",
        description: "Tu plaza está asegurada.",
      },
      denied: {
        chip: "Rechazado",
        title: "Solicitud rechazada",
        description: "Toca para ver el motivo.",
      },
      withdrawn: {
        chip: "Anulada",
        title: "Solicitud anulada",
        description: "Anulaste tu solicitud para esta clase.",
      },
      expired: {
        chip: "Expirada",
        title: "No conseguiste plaza",
        description:
          "Tu solicitud expiró sin que se liberara plaza en el grupo.",
      },
      cancelled: {
        chip: "Cancelaste",
        title: "Cancelaste la inscripción",
        description: "Tu plaza quedó libre.",
      },
      takenOut: {
        chip: "Retirado",
        title: "Te retiraron de la clase",
        reason: "Motivo: “{{reason}}”",
        noReason: "Sin motivo indicado.",
      },
    },
    cta: {
      request: "Pedir plaza",
      joinWaitingList: "Entrar en la lista de espera",
      withdraw: "Anular solicitud",
      leaveWaitingList: "Salir de la lista de espera",
      requestAgain: "Pedir de nuevo",
      cancelSeat: "Cancelar inscripción",
    },
    requestSheet: {
      title: "Pedir plaza",
      waitingListTitle: "Entrar en la lista de espera",
      note: "La solicitud queda pendiente hasta que la escuela confirme.",
      waitingListNote:
        "El grupo está lleno: tu solicitud queda en la lista de espera. Si se libera una plaza, pasa a la aprobación de la escuela.",
      deadline: "Puedes cancelar hasta {{when}}.",
      noDeadline: "Plazo aún sin definir",
      noRule: "La escuela aún no ha escrito esta regla.",
      accept: "He leído y acepto la regla de cancelación",
      read: "Leer",
      submit: "Enviar solicitud",
      submitWaitingList: "Entrar en la lista de espera",
      durationHours_one: "{{count}} hora",
      durationHours_other: "{{count}} horas",
      durationMinutes_one: "{{count}} minuto",
      durationMinutes_other: "{{count}} minutos",
      durationHoursMinutes: "{{hours}} h {{minutes}} min",
      later: "Ahora no",
      done: "Solicitud enviada",
      doneWaitingList: "Estás en la lista de espera",
    },
    denialSheet: {
      title: "Solicitud rechazada",
      label: "Motivo de la escuela",
      noReason: "Sin motivo indicado.",
      close: "Cerrar",
    },
    withdrawSheet: {
      title: "Anular solicitud",
      description: "Tu solicitud para esta clase deja de esperar aprobación.",
      confirm: "Sí, anular",
      keep: "Mantener solicitud",
      done: "Solicitud anulada",
      doneWaitingList: "Saliste de la lista de espera",
    },
    cancelSeatSheet: {
      title: "Cancelar inscripción",
      description: "Tu plaza queda libre. Puedes cancelar hasta {{deadline}}.",
      confirm: "Sí, cancelar",
      keep: "Mantener inscripción",
      done: "Inscripción cancelada",
    },
    cancelSeatNote: {
      passed:
        "El plazo para cancelar terminó el {{deadline}}. Habla con la escuela.",
      missing:
        "El plazo de cancelación de esta clase aún no se ha definido. Habla con la escuela para cancelar.",
    },
    errors: {
      started: "La clase ya empezó.",
      cancelled: "Esta clase fue cancelada.",
      alreadyOpen: "Ya tienes una solicitud abierta para esta clase.",
      waitingListClosed: "La lista de espera está cerrada para esta clase.",
      ruleNotAccepted:
        "La regla de cancelación cambió. Léela de nuevo y acéptala.",
      notPending: "Esta solicitud ya no está pendiente.",
      notFound: "Esta solicitud ya no existe.",
      notApproved: "Esta plaza ya no está aprobada.",
    },
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
    description:
      "Los admins siempre ven tu número. Elige si alumnos e instructores también pueden verlo.",
    save: "Guardar",
  },
  schoolRulesScreen: {
    title: "Reglas de la escuela",
    description:
      "Pocas y sencillas, para que las clases salgan bien para todos.",
    loading: "Cargando las reglas",
    loadError: {
      title: "No se pudieron cargar las reglas",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    empty: {
      title: "Aún no hay reglas",
      description:
        "La escuela todavía no ha publicado reglas. Vuelve a mirar pronto.",
    },
  },
  schoolRulesEntryRow: {
    title: "Reglas",
    adminSubtitle_one: "{{count}} regla en el onboarding de los alumnos",
    adminSubtitle_other: "{{count}} reglas en el onboarding de los alumnos",
    instructorSubtitle_one: "{{count}} regla para todos los alumnos",
    instructorSubtitle_other: "{{count}} reglas para todos los alumnos",
    empty: "Aún no hay reglas",
  },
  manageSchoolRules: {
    title: "Reglas de la escuela",
    intro:
      "Los alumnos leen estas reglas y deben aceptarlas antes de entrar en la app. El orden aquí es el orden que ven.",
    add: "Añadir regla",
    loading: "Cargando las reglas",
    loadError: {
      title: "No se pudieron cargar las reglas",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    empty: {
      title: "Aún no hay reglas",
      description:
        "Añade la primera regla. Los alumnos leen y aceptan las reglas antes de entrar en la app.",
    },
    moveUp: "Subir la regla {{position}}",
    moveDown: "Bajar la regla {{position}}",
    deleteSheet: {
      title: "¿Eliminar esta regla?",
      note: "Al eliminarla, todos tendrán que aceptar las reglas de nuevo la próxima vez que abran la app.",
    },
    sheet: {
      addTitle: "Nueva regla",
      editTitle: "Editar regla",
      titleLabel: "Título",
      descriptionLabel: "Explicación",
      titlePlaceholder: "Ej.: Trae protector solar",
      descriptionPlaceholder:
        "Una o dos frases cortas, hablando directamente al alumno.",
      saveNote:
        "Al guardar, todos tendrán que aceptar las reglas de nuevo la próxima vez que abran la app.",
      add: "Añadir regla",
      save: "Guardar",
      delete: "Eliminar regla",
      cancel: "Cancelar",
    },
    toasts: {
      added: "Regla añadida",
      saved: "Regla guardada",
      deleted: "Regla eliminada",
      notFound: "Esta regla ya se eliminó.",
      orderMismatch: "Las reglas cambiaron. Revisa el nuevo orden.",
    },
  },
  signOutSheet: {
    title: "¿Cerrar sesión?",
    description:
      "Para volver, solo inicia sesión otra vez con la misma cuenta.",
    confirm: "Cerrar sesión",
    cancel: "Cancelar",
  },
  about: {
    version: "Versión {{version}}",
    description:
      "Proyecto personal para sacar la reserva de clases de los grupos de WhatsApp: agenda de la semana, solicitudes de plaza y avisos en un solo lugar.",
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
    description:
      "Todas las personas de la plataforma: alumnos, instructores y admins. Busca por nombre o filtra por rol.",
    loading: "Cargando las personas",
    empty: {
      title: "No se encontró a nadie",
      description: "Prueba con otro nombre o quita los filtros de rol.",
    },
    loadError: {
      title: "No se pudo cargar a las personas",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    whatsapp: "Chatear por WhatsApp",
    whatsappNotShared: "Número no compartido.",
    email: "Correo electrónico",
    whatsappUnavailable: "No se pudo abrir WhatsApp.",
    roleActions: {
      promoteInstructor: {
        title: "Ascender a instructor",
        subtitle: "Podrá ser asignado a clases.",
      },
      promoteAdmin: {
        title: "Ascender a admin",
        subtitle: "Gestionará la escuela. También puede dar clases.",
      },
      demoteStudent: {
        title: "Bajar a alumno",
        subtitle: "Deja las próximas clases que tiene asignadas.",
      },
      adminToInstructor: {
        title: "Pasar a instructor",
        subtitle: "Deja de gestionar la escuela.",
      },
    },
    roleConfirm: {
      promoteInstructor: {
        title: "¿Ascender a {{name}} a instructor?",
        description:
          "Pasa a ser instructor: puede ser asignado a clases y ve a los alumnos inscritos. Las plazas y solicitudes que tenía en clases futuras, como alumno, se cancelan.",
        confirm: "Ascender a instructor",
      },
      promoteAdmin: {
        title: "¿Ascender a {{name}} a admin?",
        description:
          "Pasa a ser admin: gestiona clases, personas, reglas y solicitudes de la escuela. También puede dar clases.",
        seatsNote:
          "Las plazas y solicitudes que tenía en clases futuras, como alumno, se cancelan.",
        confirm: "Ascender a admin",
      },
      demoteStudent: {
        title: "¿Bajar a {{name}} a alumno?",
        description:
          "Pasa a ser alumno: deja las próximas clases que tiene asignadas, que pueden quedarse sin instructor. Las clases ya dadas quedan en el historial.",
        confirm: "Bajar a alumno",
      },
      adminToInstructor: {
        title: "¿Quitar a {{name}} de admin?",
        description:
          "Deja de gestionar la escuela y pasa a instructor. Sigue en las clases que tiene asignadas.",
        confirm: "Pasar a instructor",
      },
      back: "Volver",
    },
    roleErrors: {
      changed: "El rol de esta persona cambió. Actualiza la lista.",
      lastAdmin: "La escuela necesita al menos un admin.",
      notApproved: "Esta persona ya no está en la plataforma.",
    },
    removeAction: {
      title: "Quitar de la plataforma",
      subtitle: "Pierde el acceso a la app. Se puede restaurar durante 30 días.",
    },
    removeConfirm: {
      title: "¿Quitar a {{name}}?",
      student:
        "Pierde el acceso a la app. Sus plazas quedan libres y no pasan automáticamente a la lista de espera. Puedes restaurar la cuenta durante 30 días.",
      staff:
        "Sale de las próximas clases en las que está asignado y pierde el acceso a la app. Puedes restaurar la cuenta durante 30 días.",
      confirm: "Quitar de la plataforma",
      back: "Volver",
    },
    removed: {
      removedOn: "Quitada el {{date}}",
      deletedOn: "Eliminación definitiva el {{until}}",
      restore: "Restaurar",
      errors: {
        notRemoved: "Esta cuenta ya no está quitada.",
        windowEnded: "El plazo para restaurar esta cuenta terminó.",
      },
    },
  },
  deleteAccountSheet: {
    title: "¿Eliminar tu cuenta?",
    description:
      "Tu cuenta se cierra ahora y se cancelan tus plazas y solicitudes futuras. Puedes pedir la reactivación en un plazo de 30 días.",
    confirm: "Eliminar cuenta",
    cancel: "Cancelar",
    onlyAdmin: {
      title: "Todavía no",
      description:
        "Eres el único admin de la escuela. Haz admin a otra persona antes de eliminar tu cuenta.",
      goToPeople: "Ir a Personas",
    },
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
      placeholder:
        "Ej.: Punto de encuentro frente a la caseta del socorrista. Trae protector solar.",
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
      locationArchived: "El lugar elegido fue eliminado. Elige otro.",
    },
  },
  cancelClass: {
    title: "¿Cancelar esta clase?",
    description:
      "Avisamos a los instructores de la clase. Sigue en la agenda, marcada como cancelada.",
    descriptionWithAudience:
      "Avisamos a {{list}}. La clase sigue en la agenda, marcada como cancelada.",
    audience: {
      students_one: "{{count}} inscrito",
      students_other: "{{count}} inscritos",
      pending_one: "{{count}} persona con solicitud pendiente",
      pending_other: "{{count}} personas con solicitud pendiente",
      instructors_one: "{{count}} instructor",
      instructors_other: "{{count}} instructores",
      and: "y",
    },
    messageLabel: "Mensaje (opcional)",
    messagePlaceholder:
      "Ej.: Mar muy grande. La pasamos al sábado a la misma hora.",
    confirm: "Cancelar y avisar",
    keep: "Mantener clase",
    done: "Clase cancelada",
    errors: {
      cancelled: "Esta clase ya fue cancelada.",
      finished: "Esta clase ya terminó y no se puede cancelar.",
    },
  },
  deleteClass: {
    title: "¿Eliminar esta clase?",
    description:
      "Avisamos a los instructores y la clase sale de la agenda. No se puede deshacer.",
    confirm: "Eliminar clase",
    notEmpty: {
      title: "No se puede eliminar",
      description:
        "Alguien ya pidió plaza o está inscrito en esta clase. Solo se pueden eliminar clases sin nadie: cancélala en su lugar.",
    },
    done: "Clase eliminada",
    errors: {
      started: "La clase ya empezó y no se puede eliminar.",
      cancelled: "Esta clase fue cancelada y no se puede eliminar.",
    },
  },
  classTools: {
    title: "Herramientas de la clase",
    edit: "Editar clase",
    notify: "Enviar mensaje",
    cancel: "Cancelar clase",
    delete: "Eliminar clase",
    editHint: "Fecha, hora, lugar…",
    people_one: "{{count}} persona",
    people_other: "{{count}} personas",
    nobody: "Nadie todavía",
    notifies_one: "Avisa a {{count}} persona",
    notifies_other: "Avisa a {{count}} personas",
    nobodyToNotify: "Nadie a quien avisar",
    deleteEmpty: "Nadie inscrito",
    deleteEnrolled: "Tiene inscritos",
    deleteStarted: "Ya empezó",
  },
  editClass: {
    title: "Editar clase",
    day: {
      label: "Día",
      hint: "Cualquier día desde hoy",
    },
    time: {
      label: "Inicio y fin",
    },
    started: {
      title: "La clase ya empezó",
      description: "Solo se pueden cambiar los instructores.",
    },
    note: "Al guardar, avisamos a los instructores de la clase.",
    noteWithAudience: "Al guardar, avisamos a {{list}}.",
    audience: {
      instructors: "los instructores",
      students_one: "{{count}} inscrito",
      students_other: "{{count}} inscritos",
      pending_one: "{{count}} con solicitud pendiente",
      pending_other: "{{count}} con solicitud pendiente",
      and: "y",
    },
    submit: "Guardar y notificar",
    saved: "Cambios guardados",
    errors: {
      started: "La clase ya empezó: solo se pueden cambiar los instructores.",
      finished: "Esta clase ya terminó y no se puede cambiar.",
      cancelled: "Esta clase fue cancelada y no se puede cambiar.",
      seatsTaken:
        "La capacidad no puede quedar por debajo de las {{count}} plazas ocupadas.",
    },
  },
  timeRangeSheet: {
    title: "Nuevo horario",
    description:
      "Define la hora de inicio y de fin. Vale solo para este lote: no queda en las sugerencias.",
    start: "Inicio",
    end: "Fin",
    endBeforeStart: "El fin debe ser después del inicio.",
    submit: "Añadir horario",
  },
  locationSheet: {
    title: "Nuevo lugar",
    name: "Nombre",
    namePlaceholder: "Ej.: Praia do Futuro",
    duplicate: "Ya existe un lugar con este nombre.",
    submit: "Guardar lugar",
    editTitle: "Editar lugar",
    addressSearchPlaceholder: "Busca una dirección o una playa",
    pointHintEmpty: "Toca el mapa para marcar el punto",
    pointPicked: "Punto elegido en el mapa",
    resolving: "Buscando la dirección…",
    myLocation: "Mi ubicación",
    locationDenied:
      "Permite el acceso a la ubicación en Ajustes para usar tu posición.",
    notify: "¿Avisar a alumnos e instructores de las próximas clases?",
    notifyCount_one: "1 clase futura usa este lugar.",
    notifyCount_other: "{{count}} clases futuras usan este lugar.",
    save: "Guardar",
    remove: "Eliminar lugar",
    updated: "Lugar actualizado",
    errors: {
      gone: "Este lugar ya no está disponible.",
    },
  },
  locationPicker: {
    manage: "Gestionar",
    done: "Listo",
    archived: "Eliminado",
  },
  notifications: {
    title: "Avisos",
    markAll: "Marcar todos como leídos",
    markAllError:
      "No se pudieron marcar los avisos como leídos. Inténtalo de nuevo.",
    loading: "Cargando avisos",
    empty: {
      title: "Ningún aviso por ahora",
      description:
        "Cuando algo cambie en tus clases o en tu cuenta, te avisamos aquí.",
    },
    loadError: {
      title: "No se pudieron cargar los avisos",
      description: "Revisa tu conexión e inténtalo de nuevo.",
    },
    now: "Ahora",
    unread: ", no leído",
  },
  archiveLocation: {
    title: "¿Eliminar lugar?",
    description: "Deja de aparecer para nuevas clases.",
    kept_one: "La clase que ya usa este lugar sigue como está.",
    kept_other:
      "Las {{count}} clases que ya usan este lugar siguen como están.",
    confirm: "Eliminar lugar",
    keep: "Mantener",
    removed: "{{name}} eliminado",
  },
  teachingClasses: {
    description:
      "Las clases que vas a dar: las en curso y las próximas, día a día.",
    row: {
      assigned_one: "{{count}} clase asignada a ti",
      assigned_other: "{{count}} clases asignadas a ti",
      none: "Ninguna clase asignada",
    },
    title: "Mis clases",
    today: "Hoy",
    tomorrow: "Mañana",
    loading: "Cargando las clases",
    empty: {
      title: "Nada por aquí",
      description: "Aún no tienes clases asignadas.",
    },
    emptyFiltered: {
      surf: {
        title: "Ninguna clase de surf",
        description: "No tienes clases de surf asignadas.",
      },
      skate: {
        title: "Ninguna clase de skate",
        description: "No tienes clases de skate asignadas.",
      },
    },
    loadError: {
      title: "Algo salió mal",
      description:
        "No pudimos cargar tus clases. Revisa tu conexión e inténtalo de nuevo.",
    },
    next: "Próxima",
  },
  weeklyOccupancy: {
    title: "Ocupación semanal",
    openCalendar: "Elegir otra semana",
    rowSubtitle: "Plazas ocupadas y libres por clase",
    legend: {
      low: "menos del 50%",
      mid: "50–89%",
      high: "90%+",
      full: "Llena",
    },
    loadError: {
      title: "No se pudo cargar la ocupación",
      description: "Comprueba tu conexión e inténtalo de nuevo.",
    },
    empty: {
      title: "Sin clases esta semana",
      description: "Las clases creadas para esta semana aparecen aquí.",
    },
    relativeWeek: {
      current: "Esta semana",
      next: "Próxima semana",
      previous: "Semana pasada",
      ahead: "Dentro de {{count}} semanas",
      ago: "Hace {{count}} semanas",
    },
    stats: {
      occupancy: "Ocupación",
      seats: "Plazas",
      free: "Libres",
      full: "Llenas",
      a11y: {
        occupancy: "{{percent}}%, Ocupación",
        seats: "{{taken}} de {{total}} plazas",
        free_one: "{{count}} libre",
        free_other: "{{count}} libres",
        full_one: "{{count}} llena",
        full_other: "{{count}} llenas",
      },
    },
    cancelledCell: "canc.",
    loading: "Cargando la ocupación",
    cell: {
      active: "{{date}}, {{time}}, {{discipline}}, {{percent}}%",
      cancelled: "{{date}}, {{time}}, {{discipline}}, cancelada",
    },
  },
};

export default messages;
