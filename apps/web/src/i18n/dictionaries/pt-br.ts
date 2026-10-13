import type { Dictionary } from "../dictionary.types";

export const ptBr = {
  site: {
    name: "Rocha's Surf School",
    description: "Aulas de surf e skate da Rocha's Surf School",
  },
  header: {
    homeLabel: "Página inicial",
    languageLabel: "Idioma",
  },
  footer: {
    text: "Rocha's Surf School",
  },
  home: {
    title: "Aulas de surf e skate",
    description: "Aqui você encontra as informações públicas do app da Rocha's Surf School: como cuidamos dos seus dados e como excluir a sua conta.",
    privacyPolicy: {
      title: "Política de privacidade",
      description: "Quais dados o app coleta, por quê e por quanto tempo.",
    },
    accountDeletion: {
      title: "Exclusão de conta",
      description: "Como excluir a sua conta e o que acontece com os seus dados.",
    },
  },
} satisfies Dictionary;
