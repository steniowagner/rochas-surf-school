import type { Messages } from "./en-US";

const messages: Messages = {
  language: {
    button: "Idioma",
    title: "Idioma",
    description: "Escolha o idioma do app.",
  },
  common: {
    cancel: "Cancelar",
    close: "Fechar",
    back: "Voltar",
    clear: "Limpar",
    tryAgain: "Tentar de novo",
  },
  auth: {
    continueWithApple: "Continuar com a Apple",
    continueWithGoogle: "Continuar com o Google",
    continueWithEmail: "Continuar com e-mail",
    terms:
      "Ao continuar, você aceita nossos <terms>Termos de Uso</terms> e a <privacy>Política de Privacidade</privacy>.",
  },
  googleSignIn: {
    tokenInvalid: "Não conseguimos entrar com o Google. Tente novamente.",
    emailNotVerified:
      "Seu e-mail do Google não está verificado. Use outra forma de entrar.",
    playServices: "O Google Play Services não está disponível neste celular.",
  },
  googleName: {
    title: "Qual é o seu nome?",
    description: "Digite seu nome completo para a escola saber quem é você.",
    submit: "Continuar",
  },
  createAccount: {
    title: "Criar conta",
    subtitle: "Informe seu nome e e-mail. Enviaremos um código para confirmar.",
    namePlaceholder: "Nome e sobrenome",
    emailPlaceholder: "seu@email.com",
    submit: "Receber código",
    nameInvalid: "Informe seu nome e sobrenome.",
    emailInvalid: "Informe um e-mail válido.",
    errors: {
      invalidEmail: "Esse e-mail não parece válido. Confira e tente de novo.",
      tooManyAttempts: "Muitas tentativas. Aguarde um minuto e tente de novo.",
      sendFailed: "Não conseguimos enviar o e-mail. Tente de novo.",
      noConnection: "Sem conexão. Verifique sua internet e tente de novo.",
      generic: "Algo deu errado. Tente de novo.",
    },
  },
  emailChoice: {
    title: "Continuar com e-mail",
    subtitle: "Você já tem conta na Rocha's ou é a primeira vez?",
    existing: {
      title: "Já tenho conta",
      description: "Entre com o e-mail que você usou no cadastro.",
    },
    new: {
      title: "É minha primeira vez",
      description: "Crie sua conta com seu nome e e-mail.",
    },
  },
  emailSignIn: {
    title: "Entrar",
    subtitle:
      "Use o e-mail da sua conta. Enviaremos um código para você entrar.",
    emailPlaceholder: "seu@email.com",
    emailInvalid: "Informe um e-mail válido.",
    noAccount: "Ainda não tem conta? <create>Criar conta</create>",
    submit: "Receber código",
  },
  confirmCode: {
    title: "Confirme seu e-mail",
    description:
      "Enviamos um código de 6 dígitos para <bold>{{email}}</bold>. Ele expira em 10 minutos.",
    inputLabel: "Código de 6 dígitos",
    submit: "Confirmar",
    resend: "Reenviar código",
    resendIn: "Reenviar código em {{time}}",
    notReceived:
      "Não chegou? Veja a pasta de spam ou <change>altere o e-mail</change>.",
    errors: {
      wrongCode: "Código incorreto. Tente outra vez.",
      expired: "Este código expirou. Peça um novo.",
      locked: "Muitas tentativas erradas. Peça um novo código.",
      nameNotSaved: "Não conseguimos salvar seu nome. Volte e confira.",
      noAccount:
        "Não encontramos uma conta com este e-mail. Crie uma para continuar.",
    },
  },
  pending: {
    eyebrow: "Conta criada",
    title: "Aguardando aprovação",
    description:
      "A equipe da Rocha's vai analisar seu cadastro. Assim que for aprovado, você poderá entrar com <bold>{{email}}</bold>.",
    steps: {
      created: "Conta criada",
      approval: "Aprovação da equipe",
      inReview: "Em análise",
      bookClasses: "Reservar aulas",
    },
    now: "Agora",
    signOut: "Terminar sessão",
  },
  whatsapp: {
    eyebrow: "Conta aprovada",
    title: "Boas-vindas à Rocha's, {{firstName}}",
    description: "Só falta uma coisa antes de começar.",
    cardTitle: "Número de WhatsApp",
    helper:
      "Pedimos o número só para que a escola possa falar com você se for preciso — por exemplo, se uma aula for cancelada por causa do mar.",
    hideNumber: "Ocultar meu número",
    hideNumberHint:
      "Só os administradores da escola vão ver. Você pode mudar isso no perfil.",
    submit: "Salvar e continuar",
    pickerTitle: "País",
    pickerSearch: "Buscar país",
    invalidNumber: "Número de WhatsApp inválido.",
  },
  session: {
    expired: "Sua sessão expirou. Entre novamente.",
  },
  schoolRules: {
    eyebrow: "Último passo",
    title: "Regras da escola",
    description: "Poucas e simples — para que as aulas corram bem para todos.",
    accept: "Li e aceito as regras e os termos da Rocha's Surf School.",
    submit: "Entrar no app",
    empty: "A escola ainda não tem regras.",
    loadError: "Não foi possível carregar as regras.",
    outdated: "As regras mudaram. Leia de novo e aceite.",
    retry: "Tentar novamente",
  },
  rulesUpdate: {
    eyebrow: "Regras atualizadas",
    title: "Regras da escola",
    description:
      "Atualizamos as regras da escola. Leia e aceite para continuar usando o app.",
    submit: "Aceitar e continuar",
  },
  closedAccount: {
    useAnotherEmail: "Usar outro email",
    contactSchool: "Falar com a escola",
    whatsappUnavailable: "Não foi possível abrir o WhatsApp.",
  },
  denied: {
    eyebrow: "Cadastro não aprovado",
    title: "Não foi dessa vez",
    description:
      "A equipe da Rocha's não aprovou o cadastro de <bold>{{email}}</bold>. Se você acha que foi um engano, fale com a gente.",
    noteTitle: "Mensagem da equipe",
  },
  removed: {
    eyebrow: "Acesso removido",
    title: "Você não tem mais acesso ao app",
    description:
      "A equipe da Rocha's removeu o acesso de <bold>{{email}}</bold>. Esta conta não pode ser reativada pelo app.",
    noteTitle: "Tem dúvidas?",
    noteText: "Fale direto com a escola pelo WhatsApp.",
  },
  reactivation: {
    notRequested: {
      eyebrow: "Conta excluída",
      title: "Esta conta não está mais ativa",
      description:
        "A conta de <bold>{{email}}</bold> foi excluída. Para voltar a usá-la, peça à equipe da Rocha's que a reative.",
      noteTitle: "Como reativar",
      noteText:
        'Toque em "Pedir reativação". A equipe recebe o pedido e decide. Entre de novo com este email para ver a resposta.',
      request: "Pedir reativação",
    },
    requested: {
      eyebrow: "Pedido enviado",
      title: "A equipe vai analisar",
      description: "Recebemos seu pedido para reativar <bold>{{email}}</bold>.",
      noteTitle: "E agora?",
      noteText:
        "Quando a equipe responder, entre de novo com este email para ver a resposta.",
    },
    denied: {
      eyebrow: "Pedido recusado",
      title: "Não foi possível reativar",
      description:
        "A equipe da Rocha's recusou o pedido para reativar <bold>{{email}}</bold>. Esta conta vai continuar inativa.",
      noteTitle: "Mensagem da equipe",
    },
    accountChanged: "Sua conta mudou. Entre de novo para continuar.",
  },
  admin: {
    home: {
      toolsSection: "Ferramentas",
      schoolSection: "Escola",
      registrationsRow: "Entrar na escola",
      reactivationsRow: "Reativar contas",
      classRequestsRow: "Inscrições em aulas",
      enrolStudentRow: "Inscrever aluno",
      classRequestsCount_one: "{{count}} pedido",
      classRequestsCount_other: "{{count}} pedidos",
      newClassRow: "Criar aulas",
      cancellationRulesRow: "Regras de cancelamento",
      cancellationRulesSubtitle: "Uma para surf, outra para skate",
      schoolSettingsRow: "Configurações da escola",
      sendNoticeRow: "Enviar aviso",
      sendNoticeSubtitle: "Para todos, alunos ou instrutores",
      waiting: "{{count}} esperando",
      nothingPending: "Nada pendente",
      enrolStudentSubtitle: "Alunos da escola ou aulas experimentais",
    },
  },
  home: {
    peopleRow: "Pessoas",
  },
  reactivations: {
    title: "Reativar contas",
    waiting: "{{count}} esperando resposta",
    description:
      "Contas excluídas que pediram para voltar. Reativar devolve a conta, o histórico e o papel, mas não as vagas canceladas. A pessoa recebe uma notificação push.",
    details_one: "Excluída em {{date}} · {{count}} aula",
    details_other: "Excluída em {{date}} · {{count}} aulas",
    approve: "Reativar",
    deny: "Recusar",
    empty: {
      title: "Nenhum pedido",
      description:
        "Os pedidos de contas excluídas que querem voltar aparecem aqui.",
    },
    loadError: {
      title: "Não foi possível carregar os pedidos",
      description: "Confira sua conexão e tente de novo.",
    },
    alreadyDecided: "Este pedido já foi decidido.",
    denySheet: {
      title: "Recusar reativação?",
      hint: "A conta de {{name}} vai continuar excluída. Você pode explicar o motivo (opcional) — a pessoa recebe esta mensagem.",
      label: "Motivo (opcional)",
      placeholder: "Escreva uma mensagem para a pessoa.",
      confirm: "Recusar e avisar",
    },
  },
  registrations: {
    title: "Entrar na escola",
    waiting: "{{count}} esperando aprovação",
    description:
      "Contas novas só podem marcar aulas depois de aprovadas. A pessoa recebe uma notificação push.",
    approve: "Aprovar",
    deny: "Recusar",
    loading: "Carregando os cadastros",
    empty: {
      title: "Ninguém esperando",
      description: "As contas novas aguardando aprovação aparecem aqui.",
    },
    loadError: {
      title: "Não foi possível carregar os cadastros",
      description: "Confira sua conexão e tente de novo.",
    },
    retry: "Tentar novamente",
    alreadyDecided: "Este cadastro já foi decidido.",
    denySheet: {
      title: "Recusar entrada?",
      hint: "{{name}} não vai entrar na escola. Você pode explicar o motivo (opcional) — a pessoa recebe esta mensagem.",
      label: "Motivo (opcional)",
      placeholder: "Ex.: No momento não temos vagas para novos alunos.",
      confirm: "Recusar e avisar",
      back: "Voltar",
    },
  },
  classRequests: {
    title: "Inscrições em aulas",
    requestsCount_one: "{{count}} pedido",
    requestsCount_other: "{{count}} pedidos",
    classesCount_one: "{{count}} aula",
    classesCount_other: "{{count}} aulas",
    maxStudents_one: "Máx. {{count}} aluno",
    maxStudents_other: "Máx. {{count}} alunos",
    spotsLeft_one: "{{count}} vaga livre",
    spotsLeft_other: "{{count}} vagas livres",
    full: "Esgotado",
    waitingList: "Lista de espera · por ordem de pedido",
    fullNote:
      "Inscrever fica bloqueado enquanto a turma estiver cheia. Aumente a lotação ou espere abrir uma vaga.",
    position: "{{position}}º",
    askedAt: "Pediu às {{time}} · {{date}}",
    approve: "Inscrever",
    deny: "Recusar",
    approved: "{{name}} inscrito · aluno avisado",
    denied: "{{name}} recusado · aluno avisado",
    description:
      "Alunos pedindo para entrar nas aulas, agrupados por aula. Matricule ou recuse cada pedido; o aluno é avisado.",
    loading: "Carregando os pedidos",
    empty: {
      title: "Nada à espera",
      description: "Todas as inscrições foram decididas.",
    },
    emptyFiltered: {
      surf: {
        title: "Sem pedidos de surf",
        description: "Não há pedidos pendentes em aulas de surf.",
      },
      skate: {
        title: "Sem pedidos de skate",
        description: "Não há pedidos pendentes em aulas de skate.",
      },
    },
    loadError: {
      title: "Não foi possível carregar os pedidos",
      description: "Confira sua conexão e tente de novo.",
    },
    retry: "Tentar novamente",
    denySheet: {
      title: "Recusar inscrição?",
      hint: "{{name}} não fica inscrito nesta aula. Você pode explicar o motivo (opcional) — a pessoa recebe esta mensagem.",
      label: "Motivo (opcional)",
      placeholder: "Ex.: Esta aula é de nível avançado.",
      confirm: "Recusar e avisar",
      back: "Voltar",
    },
    errors: {
      notPending: "Este pedido já foi decidido.",
      started: "A aula já começou.",
      full: "A turma ficou cheia.",
    },
  },
  enrolStudent: {
    title: "Inscrever aluno",
    students: {
      loading: "Carregando os alunos",
      empty: {
        title: "Nenhum aluno encontrado",
        description: "Tente outro nome ou confira a grafia.",
      },
      loadError: {
        title: "Não foi possível carregar os alunos",
        description: "Confira sua conexão e tente de novo.",
      },
    },
    classes: {
      loading: "Carregando as aulas",
      empty: {
        title: "Sem aulas neste dia",
        description: "Não há aulas por começar neste dia. Escolha outro dia.",
      },
      loadError: {
        title: "Não foi possível carregar as aulas",
        description: "Confira sua conexão e tente de novo.",
      },
    },
    searchPlaceholder: "Procurar aluno",
    searchLabel: "Procurar aluno",
    hasClasses: "com aulas",
    steps: {
      who: "Quem",
      class: "Aula",
      pending: "Por escolher",
    },
    next: "Escolher aula",
    submitEmpty: "Inscrever",
    done: "{{name}} inscrito · aluno avisado",
    modeTrial: "Aula experimental",
    modeStudent: "Aluno da escola",
    doneTrial: "{{name}} inscrito",
    trial: {
      nameLabel: "Nome",
      namePlaceholder: "Ex.: Carolina Reis",
      invalidName: "Informe nome e sobrenome.",
      whatsappLabel: "WhatsApp",
      note: "Esta aula não fica no histórico — se a pessoa criar conta depois, começa do zero.",
    },
    errors: {
      alreadyApproved: "Este aluno já está inscrito nesta aula.",
      full: "A turma ficou cheia.",
      started: "A aula já começou.",
      cancelled: "Esta aula foi cancelada.",
      invalidStudent: "Este aluno não pode ser inscrito.",
      invalidGuest: "O nome ou o número deste aluno trial não é válido.",
    },
  },
  takeOutSheet: {
    title: "Retirar {{name}} da aula?",
    hint: "{{summary}}. A vaga fica livre. A pessoa recebe uma notificação, com o motivo se você escrever.",
    label: "Motivo (opcional)",
    placeholder: "Ex.: Esta turma é de nível avançado.",
    confirm: "Retirar da aula",
    back: "Voltar",
    action: "Retirar",
    done: "{{name}} retirado · aluno avisado",
    guestTitle: "Retirar {{name}} da aula?",
    guestHint:
      "{{summary}}. A vaga fica livre. É um aluno trial, sem conta — avise-o por WhatsApp.",
    guestDone: "{{name}} retirado",
    errors: {
      notApproved: "Esta vaga não está mais aprovada.",
      started: "A aula já começou.",
      guestNotFound: "Este aluno trial não está mais na aula.",
    },
  },
  flows: {
    onboarding: "Primeiros passos",
    student: "Aluno",
    instructor: "Instrutor",
    admin: "Administrador",
  },
  themeSheet: {
    title: "Tema",
    description: "Até você escolher, o app segue o tema do celular.",
  },
  theme: {
    system: "Igual ao celular",
    light: "Claro",
    dark: "Escuro",
  },
  profile: {
    role: {
      student: "Aluno",
      instructor: "Instrutor",
      admin: "Admin",
    },
    editProfile: "Editar perfil",
    whatsapp: "WhatsApp",
    whatsappVisible: "Visível",
    whatsappHidden: "Oculto",
    theme: "Tema",
    language: "Idioma",
    push: "Notificações push",
    pushNote:
      "Os avisos ficam sempre no app. Aqui você só escolhe se eles também chegam ao seu celular.",
    pushDenied: "Permita as notificações do app nos ajustes do celular.",
    schoolRules: "Regras da escola",
    cancellationRules: "Regras de cancelamento",
    about: "Sobre o app",
    privacyPolicy: "Política de privacidade",
    termsOfUse: "Termos de uso",
    removeAccount: "Remover a conta",
    signOut: "Sair",
    comingSoon: "Em breve.",
  },
  notices: {
    title: "Enviar aviso",
    description:
      "Escreva um título e uma mensagem. Todos do público recebem como notificação.",
    audience: {
      section: "Quem recebe",
      all: "Todos",
      students: "Alunos",
      instructors: "Instrutores",
    },
    count: {
      loading: "Carregando os destinatários…",
      error: "Não foi possível contar os destinatários.",
      none: "Ninguém para receber.",
      people_one: "{{count}} pessoa vai receber",
      people_other: "{{count}} pessoas vão receber",
    },
    titleLabel: "Título",
    messageLabel: "Descrição",
    titlePlaceholder: "Ex.: Mudança de praia no sábado",
    messagePlaceholder: "Escreva a mensagem",
    send: "Enviar",
    sent: "Aviso enviado",
    sendError: "Não foi possível enviar o aviso. Tente de novo.",
    confirm: {
      title_one: "Enviar a {{count}} pessoa?",
      title_other: "Enviar a {{count}} pessoas?",
      description: {
        all: "Todos — alunos, instrutores e admins — recebem uma notificação. Depois de enviado, não dá para apagar.",
        students:
          "Todos os alunos recebem uma notificação. Depois de enviado, não dá para apagar.",
        instructors:
          "Todos os instrutores recebem uma notificação. Depois de enviado, não dá para apagar.",
      },
      send: "Sim, enviar",
      cancel: "Voltar e editar",
    },
  },
  schoolSettings: {
    title: "Configurações da escola",
    description:
      "Como os alunos pedem vaga nas turmas cheias e como falam com a escola.",
    waitingList: {
      section: "Lista de espera",
      label: "Lista de espera nas turmas cheias",
      on: "Numa aula cheia, os alunos podem entrar na lista de espera. Se abrir vaga, o pedido passa para a sua aprovação.",
      off: "Desligada — numa aula cheia, os alunos veem «Turma cheia» e não podem pedir.",
    },
    whatsapp: {
      section: "WhatsApp da escola",
      helper: "É o número do botão «Falar com a escola».",
    },
    save: "Salvar",
    saved: "Configurações salvas",
    loading: "Carregando as configurações",
    loadError: {
      title: "Não foi possível carregar as configurações",
      description: "Confira sua conexão e tente de novo.",
    },
  },
  cancellationRules: {
    sheet: {
      title: "Regras de cancelamento",
      empty: "A escola ainda não escreveu esta regra.",
      loadError: "Não foi possível carregar as regras.",
      retry: "Tentar novamente",
      close: "Fechar",
    },
    screen: {
      title: "Regras de cancelamento",
      intro:
        "Há uma regra para cada modalidade. O app lê a regra com os dados da aula — nunca os dos alunos — e calcula até quando cada aula pode ser cancelada.",
      tipTime:
        'Indique prazos exatos em horas antes do início da aula — nada de "em cima da hora".',
      tipAmbiguity:
        "Evite ambiguidade: se uma pessoa hesitar ao ler, o app também vai hesitar.",
      placeholder:
        "Ex.: O aluno pode cancelar sem penalidade até 12 horas antes do início da aula…",
      save: "Salvar regra de {{discipline}}",
      saved: "Regra de {{discipline}} salva",
      loading: "Carregando a regra",
      loadError: {
        title: "Não foi possível carregar as regras",
        description: "Confira sua conexão e tente de novo.",
      },
      discipline: { surf: "surf", skate: "skate" },
    },
  },
  myClasses: {
    title: "Minhas aulas",
    history: "Histórico",
    filters: {
      all: "Todas",
      pending: "Pendentes",
      confirmed: "Confirmadas",
      ended: "Encerradas",
    },
    empty: {
      title: "Nada por aqui",
      all: "Você ainda não pediu vaga em nenhuma aula.",
      filtered: "Você não tem pedidos com este status.",
      allSport: "Você ainda não pediu vaga em nenhuma aula de {{sport}}.",
      filteredSport: "Você não tem pedidos de {{sport}} com este status.",
    },
    loading: "Carregando as aulas",
    loadError: {
      title: "Algo deu errado",
      description:
        "Não conseguimos carregar suas aulas. Verifique sua conexão e tente novamente.",
    },
  },
  myHistory: {
    title: "Aulas anteriores",
    legend: "Dias em que você fez aula",
    hasClasses: "você fez aula",
    allClasses: "Todas as aulas",
    clearDay: "Limpar {{date}}",
    loading: "Carregando as aulas",
    loadError: {
      title: "Algo deu errado",
      description:
        "Não conseguimos carregar seu histórico. Verifique sua conexão e tente novamente.",
    },
    emptyDay: {
      title: "Sem aulas neste dia",
      description: "Você não fez nenhuma aula neste dia.",
      descriptionSport: "Você não fez nenhuma aula de {{sport}} neste dia.",
    },
    emptyPeriod: {
      title: "Sem aulas neste período",
      description: "Você não fez nenhuma aula neste período.",
      descriptionSport: "Você não fez nenhuma aula de {{sport}} neste período.",
    },
  },
  teachingHistory: {
    description:
      "Todas as aulas que você já deu, mês a mês ou semana a semana.",
    title: "Aulas anteriores",
    legend: "Dias em que você deu aula",
    hasClasses: "você deu aula",
    allClasses: "Todas as aulas",
    clearDay: "Limpar {{date}}",
    loading: "Carregando as aulas",
    loadError: {
      title: "Algo deu errado",
      description:
        "Não conseguimos carregar suas aulas anteriores. Verifique sua conexão e tente novamente.",
    },
    emptyDay: {
      title: "Sem aulas neste dia",
      description: "Você não deu nenhuma aula neste dia.",
      descriptionSport: "Você não deu nenhuma aula de {{sport}} neste dia.",
    },
    emptyPeriod: {
      title: "Sem aulas neste período",
      description: "Você não deu nenhuma aula neste período.",
      descriptionSport: "Você não deu nenhuma aula de {{sport}} neste período.",
    },
  },
  userHeader: {
    greeting: {
      morning: "Bom dia,",
      afternoon: "Boa tarde,",
      evening: "Boa noite,",
    },
    notifications: "Notificações",
    notificationsUnread_one: "Notificações, {{count}} não lida",
    notificationsUnread_other: "Notificações, {{count}} não lidas",
  },
  tabs: {
    agenda: "Agenda",
    myClasses: "Minhas aulas",
    school: "Escola",
    home: "Início",
    panel: "Painel",
    classes: "Aulas",
    profile: "Perfil",
  },
  weekMonthCalendar: {
    showMonth: "Ver o mês",
    showWeek: "Ver a semana",
    previousWeek: "Ver a semana anterior",
    nextWeek: "Ver a semana seguinte",
    previousMonth: "Ver o mês anterior",
    nextMonth: "Ver o mês seguinte",
  },
  classesWeek: {
    loading: "Carregando as aulas",
    hasClasses: "com aulas",
    disciplineFilter: {
      all: "Todas",
      surf: "Surf",
      skate: "Skate",
      open: "Filtrar por modalidade",
      close: "Fechar filtro",
    },
    emptyDay: {
      title: "Sem aulas neste dia",
      description: "Ainda não há aulas marcadas para {{date}}.",
    },
    create: "Criar aula",
    newClass: "Nova aula",
    loadError: {
      title: "Algo deu errado",
      description:
        "Não conseguimos carregar as aulas de {{date}}. Verifique sua conexão e tente novamente.",
    },
    state: {
      started: "Em andamento",
      finished: "Finalizada",
    },
    cancelled: "Cancelada",
    noInstructor: "Sem instrutor",
    noDeadline: "Sem prazo",
    occupancy: "{{taken}}/{{capacity}} vagas",
    full: "Sem vagas",
    students: {
      none: "Ainda sem alunos",
      confirmed_one: "{{count}} aluno confirmado",
      confirmed_other: "{{count}} alunos confirmados",
      present_one: "{{count}} aluno presente",
      present_other: "{{count}} alunos presentes",
    },
  },
  classDetails: {
    title: "Detalhe",
    today: "Hoje",
    tomorrow: "Amanhã",
    yesterday: "Ontem",
    started: {
      title: "Em andamento",
      description: "Começou às {{start}} e termina às {{end}}.",
    },
    finished: {
      title: "Aula finalizada",
      description: "Terminou às {{end}}.",
    },
    cancelled: {
      title: "Aula cancelada",
      description: "Esta aula não vai acontecer.",
    },
    instructor_one: "Instrutor",
    instructor_other: "Instrutores",
    you: "Você",
    capacity_one: "Máx. {{count}} aluno",
    capacity_other: "Máx. {{count}} alunos",
    theClass: "A aula",
    spotsLeft_one: "{{count}} vaga livre",
    spotsLeft_other: "{{count}} vagas livres",
    soldOut: "esgotado",
    guestsWarning_one:
      "1 aluno trial não tem conta e não recebe o aviso — fale com ele por WhatsApp.",
    guestsWarning_other:
      "{{count}} alunos trial não têm conta e não recebem o aviso — fale com eles por WhatsApp.",
    trialChip: "Trial",
    includesTrial_one: "inclui {{count}} trial",
    includesTrial_other: "inclui {{count}} trial",
    full: {
      title: "Turma cheia",
      waitingList: "Você pode entrar na lista de espera.",
      waitingListClosed: "A lista de espera está fechada para esta aula.",
      newRequestsWait: "Novos pedidos entram na lista de espera.",
      waitingListOff: "A lista de espera está desligada — ninguém pode pedir.",
    },
    rules: {
      title: "Regras",
      cancellation: "Cancelamento",
      until: "Até {{when}}",
      read: "Ler a regra",
      school: "Regras da escola",
      schoolCount_one: "{{count}} regra para todos os alunos",
      schoolCount_other: "{{count}} regras para todos os alunos",
    },
    readOnly: {
      teaches:
        "Matrículas, cancelamentos e mudanças de horário são feitos pela escola",
      notAssigned:
        "Você não está escalado nesta aula — você vê tudo em modo somente leitura",
    },
    notes: "Notas",
    location: "Onde e como",
    directions: "Direções",
    directionsUnavailable: "Não foi possível abrir o mapa.",
    loadError: "Não foi possível carregar a aula.",
    notFound: "Esta aula não existe mais.",
    retry: "Tentar novamente",
    loading: "Carregando a aula",
    errorState: {
      title: "Algo deu errado",
      description:
        "Não conseguimos carregar esta aula. Verifique sua conexão e tente novamente.",
    },
    notFoundState: {
      title: "Aula não encontrada",
      description: "Esta aula foi excluída ou não existe mais.",
    },
    noInstructor: {
      title: "Sem instrutor",
      description: "Atribua um instrutor antes da aula.",
    },
    noInstructorAssigned: "Sem instrutor atribuído",
    noDeadline: {
      title: "Sem prazo de cancelamento",
      description:
        "Ainda não conseguimos calcular até quando os alunos podem cancelar. Confira a regra de {{discipline}}.",
    },
    tools: "Ferramentas da aula",
  },
  enrolment: {
    status: {
      pending: {
        chip: "Pendente",
        title: "Pedido pendente",
        description: "Seu pedido aguarda a aprovação da escola.",
      },
      waitingList: {
        chip: "Na lista de espera",
        title: "Você está na lista de espera",
        description:
          "Se abrir uma vaga, seu pedido passa para a aprovação da escola.",
      },
      approved: {
        chip: "Aprovado",
        title: "Você está inscrito",
        description: "Sua vaga está garantida.",
      },
      denied: {
        chip: "Recusado",
        title: "Pedido recusado",
        description: "Toque para ver o motivo.",
      },
      withdrawn: {
        chip: "Anulado",
        title: "Pedido anulado",
        description: "Você anulou seu pedido para esta aula.",
      },
      expired: {
        chip: "Expirado",
        title: "Você não conseguiu vaga",
        description: "Seu pedido expirou sem abrir vaga na turma.",
      },
      cancelled: {
        chip: "Você cancelou",
        title: "Você cancelou a inscrição",
        description: "Sua vaga ficou livre.",
      },
      takenOut: {
        chip: "Retirado",
        title: "Você foi retirado da aula",
        reason: "Motivo: “{{reason}}”",
        noReason: "Sem motivo indicado.",
      },
    },
    cta: {
      request: "Pedir para entrar",
      joinWaitingList: "Entrar na lista de espera",
      withdraw: "Anular pedido",
      leaveWaitingList: "Sair da lista de espera",
      requestAgain: "Pedir novamente",
      cancelSeat: "Cancelar inscrição",
    },
    requestSheet: {
      title: "Pedir para entrar",
      waitingListTitle: "Entrar na lista de espera",
      note: "O pedido fica pendente até a escola confirmar.",
      waitingListNote:
        "A turma está cheia: seu pedido fica na lista de espera. Se abrir uma vaga, ele passa para a aprovação da escola.",
      deadline: "Você pode cancelar até {{when}}.",
      noDeadline: "Prazo ainda não definido",
      noRule: "A escola ainda não escreveu esta regra.",
      accept: "Li e aceito a regra de cancelamento",
      read: "Ler",
      submit: "Enviar pedido",
      submitWaitingList: "Entrar na lista de espera",
      durationHours_one: "{{count}} hora",
      durationHours_other: "{{count}} horas",
      durationMinutes_one: "{{count}} minuto",
      durationMinutes_other: "{{count}} minutos",
      durationHoursMinutes: "{{hours}} h {{minutes}} min",
      later: "Agora não",
      done: "Pedido enviado",
      doneWaitingList: "Você está na lista de espera",
    },
    denialSheet: {
      title: "Pedido recusado",
      label: "Motivo da escola",
      noReason: "Sem motivo indicado.",
      close: "Fechar",
    },
    withdrawSheet: {
      title: "Anular pedido",
      description: "Seu pedido para esta aula deixa de esperar aprovação.",
      confirm: "Sim, anular",
      keep: "Manter pedido",
      done: "Pedido anulado",
      doneWaitingList: "Você saiu da lista de espera",
    },
    cancelSeatSheet: {
      title: "Cancelar inscrição",
      description: "Sua vaga fica livre. Você pode cancelar até {{deadline}}.",
      confirm: "Sim, cancelar",
      keep: "Manter inscrição",
      done: "Inscrição cancelada",
    },
    cancelSeatNote: {
      passed:
        "O prazo para cancelar terminou em {{deadline}}. Fale com a escola.",
      missing:
        "O prazo de cancelamento desta aula ainda não foi definido. Fale com a escola para cancelar.",
    },
    errors: {
      started: "A aula já começou.",
      cancelled: "Esta aula foi cancelada.",
      alreadyOpen: "Você já tem um pedido aberto para esta aula.",
      waitingListClosed: "A lista de espera está fechada para esta aula.",
      ruleNotAccepted: "A regra de cancelamento mudou. Leia de novo e aceite.",
      notPending: "Este pedido não está mais pendente.",
      notFound: "Este pedido não existe mais.",
      notApproved: "Esta vaga não está mais aprovada.",
    },
  },
  editProfile: {
    title: "Editar perfil",
    nameLabel: "Nome",
    emailLabel: "E-mail",
    emailHint: "Seu e-mail não pode ser alterado.",
    changePhoto: "Mudar foto de perfil",
    save: "Salvar",
  },
  profileWhatsapp: {
    title: "WhatsApp",
    description:
      "Os admins sempre veem seu número. Escolha se alunos e instrutores também podem ver.",
    save: "Salvar",
  },
  schoolRulesScreen: {
    title: "Regras da escola",
    description: "Poucas e simples, para as aulas correrem bem para todos.",
    loading: "Carregando as regras",
    loadError: {
      title: "Não foi possível carregar as regras",
      description: "Confira sua conexão e tente de novo.",
    },
    empty: {
      title: "Nenhuma regra ainda",
      description: "A escola ainda não publicou regras. Volte em breve.",
    },
  },
  schoolRulesEntryRow: {
    title: "Regras",
    adminSubtitle_one: "{{count}} regra no onboarding dos alunos",
    adminSubtitle_other: "{{count}} regras no onboarding dos alunos",
    instructorSubtitle_one: "{{count}} regra para todos os alunos",
    instructorSubtitle_other: "{{count}} regras para todos os alunos",
    empty: "Nenhuma regra ainda",
  },
  manageSchoolRules: {
    title: "Regras da escola",
    intro:
      "Os alunos leem estas regras e precisam aceitá-las antes de entrar no app. A ordem aqui é a ordem que eles veem.",
    add: "Adicionar regra",
    loading: "Carregando as regras",
    loadError: {
      title: "Não foi possível carregar as regras",
      description: "Confira sua conexão e tente de novo.",
    },
    empty: {
      title: "Nenhuma regra ainda",
      description:
        "Adicione a primeira regra. Os alunos leem e aceitam as regras antes de entrar no app.",
    },
    moveUp: "Subir a regra {{position}}",
    moveDown: "Descer a regra {{position}}",
    deleteSheet: {
      title: "Excluir esta regra?",
      note: "Depois de excluir, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app.",
    },
    sheet: {
      addTitle: "Nova regra",
      editTitle: "Editar regra",
      titleLabel: "Título",
      descriptionLabel: "Explicação",
      titlePlaceholder: "Ex.: Traga protetor solar",
      descriptionPlaceholder:
        "Uma ou duas frases curtas, falando direto com o aluno.",
      saveNote:
        "Ao salvar, todos vão precisar aceitar as regras de novo na próxima vez que abrirem o app.",
      add: "Adicionar regra",
      save: "Salvar",
      delete: "Excluir regra",
      cancel: "Cancelar",
    },
    toasts: {
      added: "Regra adicionada",
      saved: "Regra salva",
      deleted: "Regra excluída",
      notFound: "Esta regra já foi excluída.",
      orderMismatch: "As regras mudaram. Confira a nova ordem.",
    },
  },
  signOutSheet: {
    title: "Sair da conta?",
    description: "Para voltar, é só entrar de novo com a mesma conta.",
    confirm: "Sair",
    cancel: "Cancelar",
  },
  about: {
    version: "Versão {{version}}",
    description:
      "Projeto pessoal para tirar a marcação de aulas dos grupos de WhatsApp: agenda da semana, pedidos de vaga e avisos num só lugar.",
    creatorRole: "Design e desenvolvimento",
    repository: "Repositório do app",
    creatorGithub: "GitHub do criador",
    creatorLinkedin: "LinkedIn do criador",
    close: "Fechar",
  },
  people: {
    title: "Pessoas",
    count: "{{count}} na plataforma",
    searchPlaceholder: "Procurar pessoa",
    filter: {
      student: "Alunos",
      instructor: "Instrutores",
      admin: "Admins",
    },
    since: "desde {{date}}",
    description:
      "Todos na plataforma: alunos, instrutores e admins. Procure pelo nome ou filtre por função.",
    loading: "Carregando as pessoas",
    empty: {
      title: "Ninguém encontrado",
      description: "Tente outro nome ou limpe os filtros de função.",
    },
    loadError: {
      title: "Não foi possível carregar as pessoas",
      description: "Confira sua conexão e tente de novo.",
    },
    whatsapp: "Conversar por WhatsApp",
    whatsappNotShared: "Número não compartilhado.",
    email: "E-mail",
    whatsappUnavailable: "Não foi possível abrir o WhatsApp.",
    roleActions: {
      promoteInstructor: {
        title: "Promover a instrutor",
        subtitle: "Passa a poder ser atribuído a aulas.",
      },
      promoteAdmin: {
        title: "Promover a admin",
        subtitle: "Passa a gerenciar a escola. Pode também dar aulas.",
      },
      demoteStudent: {
        title: "Rebaixar a aluno",
        subtitle: "Sai das próximas aulas em que está atribuído.",
      },
      adminToInstructor: {
        title: "Passar a instrutor",
        subtitle: "Deixa de gerenciar a escola.",
      },
    },
    roleConfirm: {
      promoteInstructor: {
        title: "Promover {{name}} a instrutor?",
        description:
          "Passa a ser instrutor: pode ser atribuído a aulas e vê os alunos inscritos. As vagas e pedidos que tinha em aulas futuras, como aluno, são cancelados.",
        confirm: "Promover a instrutor",
      },
      promoteAdmin: {
        title: "Promover {{name}} a admin?",
        description:
          "Passa a ser admin: gerencia aulas, pessoas, regras e pedidos da escola. Pode também dar aulas.",
        seatsNote:
          "As vagas e pedidos que tinha em aulas futuras, como aluno, são cancelados.",
        confirm: "Promover a admin",
      },
      demoteStudent: {
        title: "Rebaixar {{name}} a aluno?",
        description:
          "Passa a ser aluno: sai das próximas aulas em que está atribuído, que podem ficar sem instrutor. As aulas já dadas ficam no histórico.",
        confirm: "Rebaixar a aluno",
      },
      adminToInstructor: {
        title: "Tirar {{name}} de admin?",
        description:
          "Deixa de gerenciar a escola e passa a instrutor. Continua nas aulas em que está atribuído.",
        confirm: "Passar a instrutor",
      },
      back: "Voltar",
    },
    roleErrors: {
      changed: "O papel desta pessoa mudou. Atualize a lista.",
      lastAdmin: "A escola precisa de pelo menos um admin.",
      notApproved: "Esta pessoa não está mais na plataforma.",
    },
    removeAction: {
      title: "Remover da plataforma",
      subtitle: "Perde o acesso ao app. Restaurável durante 30 dias.",
    },
    removeConfirm: {
      title: "Remover {{name}}?",
      student:
        "Perde o acesso ao app. As vagas que ocupava ficam livres e não passam automaticamente para a lista de espera. Você pode restaurar a conta durante 30 dias.",
      staff:
        "Sai das próximas aulas em que está atribuído e perde o acesso ao app. Você pode restaurar a conta durante 30 dias.",
      confirm: "Remover da plataforma",
      back: "Voltar",
    },
    removed: {
      title: "Contas removidas",
      hint: "restauráveis durante 30 dias",
      row: "{{role}} · removida em {{date}} · até {{until}}",
      restore: "Restaurar",
      errors: {
        notRemoved: "Esta conta já não está removida.",
        windowEnded: "O prazo para restaurar esta conta acabou.",
      },
    },
  },
  deleteAccountSheet: {
    title: "Remover a conta?",
    description:
      "Sua conta é encerrada agora e suas vagas e pedidos futuros são cancelados. Você pode pedir a reativação em até 30 dias.",
    confirm: "Remover a conta",
    cancel: "Cancelar",
    onlyAdmin: {
      title: "Ainda não dá",
      description:
        "Você é o único admin da escola. Promova outra pessoa a admin antes de remover sua conta.",
      goToPeople: "Ir para Pessoas",
    },
  },
  newClass: {
    title: "Nova aula",
    discipline: {
      label: "Modalidade",
      surf: "Surf",
      skate: "Skate",
    },
    level: {
      label: "Nível",
      hint: "só informativo",
      beginner: "Iniciante",
      advanced: "Avançado",
      expert: "Expert",
    },
    days: {
      label: "Dias",
      count_one: "1 dia",
      count_other: "{{count}} dias",
      pickOne: "escolha pelo menos 1",
    },
    calendar: {
      start: "Toque em um dia para começar",
      pickEnd: "{{date}} · toque em outro dia para um intervalo",
      clear: "Limpar",
      previousMonth: "Mês anterior",
      nextMonth: "Próximo mês",
    },
    range: {
      excluded: "Dias removidos",
      noneExcluded: "Nenhum dia removido",
      description:
        "Toque em um dia do intervalo para removê-lo. Toque de novo para incluí-lo.",
    },
    timeRanges: {
      label: "Horários",
      pickOne: "escolha pelo menos 1",
      hint: "Sugeridos a partir das aulas da semana passada.",
      hintPast: "Os horários que já passaram não terão aula hoje.",
      hintOverlap: "Horários sobrepostos não podem ir no mesmo lote.",
      add: "Novo horário",
    },
    location: {
      label: "Local",
      pickOne: "escolha um local",
      add: "Novo local",
    },
    capacity: {
      label: "Lotação máxima",
      unit: "alunos por aula",
      decrease: "Diminuir",
      increase: "Aumentar",
    },
    notes: {
      label: "Notas",
      optional: "opcional",
      placeholder:
        "Ex.: Ponto de encontro em frente à barraca do salva-vidas. Traga protetor solar.",
    },
    instructors: {
      label: "Instrutores",
      pickOne: "pelo menos 1",
      loadError: "Não foi possível carregar os instrutores.",
    },
    summary: {
      days_one: "1 dia",
      days_other: "{{count}} dias",
      times_one: "1 horário",
      times_other: "{{count}} horários",
      line: "{{days}} × {{times}} · {{location}}",
    },
    submit_one: "Criar aula",
    submit_other: "Criar {{count}} aulas",
    tooMany: "Máximo de {{max}} aulas por vez.",
    created_one: "Aula criada",
    created_other: "{{count}} aulas criadas",
    errors: {
      past: "Um dos horários já passou. Revise as datas e os horários.",
      instructors: "Um dos instrutores não pode mais dar aulas.",
      location: "O local escolhido não existe mais.",
      locationArchived: "O local escolhido foi removido. Escolha outro.",
    },
  },
  cancelClass: {
    title: "Cancelar esta aula?",
    description:
      "Avisamos os instrutores da aula. Ela continua na agenda, marcada como cancelada.",
    descriptionWithAudience:
      "Avisamos {{list}}. A aula fica na agenda, marcada como cancelada.",
    audience: {
      students_one: "{{count}} inscrito",
      students_other: "{{count}} inscritos",
      pending_one: "{{count}} pessoa com pedido pendente",
      pending_other: "{{count}} pessoas com pedido pendente",
      instructors_one: "{{count}} instrutor",
      instructors_other: "{{count}} instrutores",
      and: "e",
    },
    messageLabel: "Mensagem (opcional)",
    messagePlaceholder:
      "Ex.: Mar muito grande. Remarcamos para sábado no mesmo horário.",
    confirm: "Cancelar e avisar",
    keep: "Manter aula",
    done: "Aula cancelada",
    errors: {
      cancelled: "Esta aula já foi cancelada.",
      finished: "Esta aula já terminou e não pode mais ser cancelada.",
    },
  },
  deleteClass: {
    title: "Excluir esta aula?",
    description:
      "Os instrutores são avisados e a aula sai da agenda. Não dá para desfazer.",
    confirm: "Excluir aula",
    notEmpty: {
      title: "Não dá para excluir",
      description:
        "Alguém já pediu vaga ou está inscrito nesta aula. Só dá para excluir aulas sem ninguém — cancele-a em vez disso.",
    },
    done: "Aula excluída",
    errors: {
      started: "A aula já começou e não pode mais ser excluída.",
      cancelled: "Esta aula foi cancelada e não pode ser excluída.",
    },
  },
  classTools: {
    title: "Ferramentas da aula",
    edit: "Editar aula",
    notify: "Enviar mensagem",
    cancel: "Cancelar aula",
    delete: "Apagar aula",
    editHint: "Data, hora, local…",
    people_one: "{{count}} pessoa",
    people_other: "{{count}} pessoas",
    nobody: "Ninguém ainda",
    notifies_one: "Avisa {{count}} pessoa",
    notifies_other: "Avisa {{count}} pessoas",
    nobodyToNotify: "Ninguém para avisar",
    deleteEmpty: "Ninguém inscrito",
    deleteEnrolled: "Tem inscritos",
    deleteStarted: "Já começou",
  },
  editClass: {
    title: "Editar aula",
    day: {
      label: "Dia",
      hint: "Qualquer dia a partir de hoje",
    },
    time: {
      label: "Início e fim",
    },
    started: {
      title: "A aula já começou",
      description: "Só dá para trocar os instrutores.",
    },
    note: "Ao salvar, avisamos os instrutores da aula.",
    noteWithAudience: "Ao salvar, avisamos {{list}}.",
    audience: {
      instructors: "os instrutores",
      students_one: "{{count}} inscrito",
      students_other: "{{count}} inscritos",
      pending_one: "{{count}} com pedido pendente",
      pending_other: "{{count}} com pedido pendente",
      and: "e",
    },
    submit: "Salvar e notificar",
    saved: "Alterações salvas",
    errors: {
      started: "A aula já começou: só dá para trocar os instrutores.",
      finished: "Esta aula já terminou e não pode mais ser alterada.",
      cancelled: "Esta aula foi cancelada e não pode mais ser alterada.",
      seatsTaken:
        "A lotação não pode ficar abaixo das {{count}} vagas ocupadas.",
    },
  },
  timeRangeSheet: {
    title: "Novo horário",
    description:
      "Defina a hora de início e de fim. Vale só para este lote — não fica nas sugestões.",
    start: "Início",
    end: "Fim",
    endBeforeStart: "O fim precisa ser depois do início.",
    submit: "Adicionar horário",
  },
  locationSheet: {
    title: "Novo local",
    name: "Nome",
    namePlaceholder: "Ex.: Praia do Futuro",
    duplicate: "Já existe um local com este nome.",
    submit: "Salvar local",
    editTitle: "Editar local",
    addressSearchPlaceholder: "Busque um endereço ou uma praia",
    pointHintEmpty: "Toque no mapa para marcar o ponto",
    pointPicked: "Ponto escolhido no mapa",
    resolving: "Buscando o endereço…",
    myLocation: "Minha localização",
    locationDenied:
      "Permita o acesso à localização nos Ajustes para usar sua posição.",
    notify: "Avisar alunos e instrutores das próximas aulas?",
    notifyCount_one: "1 aula futura usa este local.",
    notifyCount_other: "{{count}} aulas futuras usam este local.",
    save: "Salvar",
    remove: "Remover local",
    updated: "Local atualizado",
    errors: {
      gone: "Este local não está mais disponível.",
    },
  },
  locationPicker: {
    manage: "Gerir",
    done: "Concluir",
    archived: "Removido",
  },
  notifications: {
    title: "Avisos",
    markAll: "Marcar todos como lidos",
    markAllError:
      "Não foi possível marcar os avisos como lidos. Tente de novo.",
    loading: "Carregando avisos",
    empty: {
      title: "Nenhum aviso por enquanto",
      description:
        "Quando algo mudar nas suas aulas ou na sua conta, avisamos aqui.",
    },
    loadError: {
      title: "Não foi possível carregar os avisos",
      description: "Verifique sua conexão e tente de novo.",
    },
    now: "Agora",
    unread: ", não lido",
  },
  archiveLocation: {
    title: "Remover local?",
    description: "Ele deixa de aparecer para novas aulas.",
    kept_one: "A aula que já usa este local continua como está.",
    kept_other:
      "As {{count}} aulas que já usam este local continuam como estão.",
    confirm: "Remover local",
    keep: "Manter",
    removed: "{{name}} removido",
  },
  teachingClasses: {
    description:
      "As aulas que você vai dar: as em andamento e as próximas, dia a dia.",
    row: {
      assigned_one: "{{count}} aula atribuída a você",
      assigned_other: "{{count}} aulas atribuídas a você",
      none: "Nenhuma aula atribuída",
    },
    title: "Minhas aulas",
    today: "Hoje",
    tomorrow: "Amanhã",
    loading: "Carregando as aulas",
    empty: {
      title: "Nada por aqui",
      description: "Você ainda não tem aulas atribuídas.",
    },
    emptyFiltered: {
      surf: {
        title: "Nenhuma aula de surf",
        description: "Você não tem aulas de surf atribuídas.",
      },
      skate: {
        title: "Nenhuma aula de skate",
        description: "Você não tem aulas de skate atribuídas.",
      },
    },
    loadError: {
      title: "Algo deu errado",
      description:
        "Não conseguimos carregar suas aulas. Verifique sua conexão e tente novamente.",
    },
    next: "Próxima",
  },
  weeklyOccupancy: {
    title: "Ocupação semanal",
    openCalendar: "Escolher outra semana",
    rowSubtitle: "Lugares ocupados e vagas por aula",
    legend: {
      low: "menos de 50%",
      mid: "50–89%",
      high: "90%+",
      full: "Cheia",
    },
    loadError: {
      title: "Não foi possível carregar a ocupação",
      description: "Confira sua conexão e tente de novo.",
    },
    empty: {
      title: "Sem aulas nesta semana",
      description: "As aulas criadas para esta semana aparecem aqui.",
    },
    relativeWeek: {
      current: "Esta semana",
      next: "Próxima semana",
      previous: "Semana passada",
      ahead: "Daqui a {{count}} semanas",
      ago: "Há {{count}} semanas",
    },
    stats: {
      occupancy: "Ocupação",
      seats: "Lugares",
      free: "Livres",
      full: "Cheias",
      a11y: {
        occupancy: "{{percent}}%, Ocupação",
        seats: "{{taken}} de {{total}} lugares",
        free_one: "{{count}} livre",
        free_other: "{{count}} livres",
        full_one: "{{count}} cheia",
        full_other: "{{count}} cheias",
      },
    },
    cancelledCell: "canc.",
    loading: "Carregando a ocupação",
    cell: {
      active: "{{date}}, {{time}}, {{discipline}}, {{percent}}%",
      cancelled: "{{date}}, {{time}}, {{discipline}}, cancelada",
    },
  },
};

export default messages;
