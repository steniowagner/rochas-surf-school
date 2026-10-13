import type { Messages } from "./en-US";

const messages: Messages = {
  language: {
    button: "Idioma",
    title: "Idioma",
    description: "Escolha o idioma do app.",
  },
  common: {
    close: "Fechar",
    back: "Voltar",
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
    },
    accountChanged: "Sua conta mudou. Entre de novo para continuar.",
  },
  admin: {
    home: {
      title: "Ferramentas da escola",
      registrationsRow: "Entrar na escola",
      waiting: "{{count}} esperando",
    },
  },
  registrations: {
    title: "Entrar na escola",
    description: "Pessoas esperando a aprovação da escola.",
    asked: "Pediu {{time}}",
    askedNow: "Pediu agora",
    approve: "Aprovar",
    deny: "Recusar",
    empty: "Ninguém esperando para entrar.",
    loadError: "Não foi possível carregar os cadastros.",
    retry: "Tentar novamente",
    alreadyDecided: "Este cadastro já foi decidido.",
    denySheet: {
      title: "Recusar {{name}}?",
      hint: "O motivo é opcional e será mostrado para a pessoa.",
      label: "Motivo (opcional)",
      confirm: "Recusar cadastro",
    },
  },
  decision: {
    decidedJustNow: "Decididos agora",
    approved: "Aprovado",
    denied: "Recusado",
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
    pushNote: "Os avisos ficam sempre no app. Aqui você só escolhe se eles também chegam ao seu celular.",
    pushDenied: "Permita as notificações do app nos ajustes do celular.",
    schoolRules: "Regras da escola",
    cancellationRules: "Regras de cancelamento",
    about: "Sobre o app",
    privacyPolicy: "Política de privacidade",
    termsOfUse: "Termos de uso",
    signOut: "Sair",
    comingSoon: "Em breve.",
  },
  tabs: {
    agenda: "Agenda",
    myClasses: "Minhas aulas",
    school: "Escola",
    home: "Início",
    classes: "Aulas",
    profile: "Perfil",
  },
};

export default messages;
