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
    },
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
