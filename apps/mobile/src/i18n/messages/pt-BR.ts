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
  flows: {
    onboarding: "Primeiros passos",
    reactivation: "Reativação",
    offboardingDenied: "Cadastro recusado",
    offboardingRemoved: "Acesso removido",
    student: "Aluno",
    instructor: "Instrutor",
    admin: "Administrador",
  },
};

export default messages;
