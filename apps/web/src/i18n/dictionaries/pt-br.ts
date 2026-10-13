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
  privacyPolicy: {
    metaTitle: "Política de privacidade",
    metaDescription: "Quais dados o app da Rocha's Surf School coleta, por quê, por quanto tempo e quem os trata.",
    title: "Política de privacidade",
    description: "Esta política explica quais dados o app da Rocha's Surf School coleta, por que, por quanto tempo os guardamos e quais serviços os tratam.",
    lastUpdatedLabel: "Última atualização",
    lastUpdated: "12 de outubro de 2026",
    collected: {
      title: "O que coletamos",
      intro: "Coletamos apenas o que o app precisa para funcionar:",
      items: [
        "Seu nome, e-mail e foto.",
        "Seu número de WhatsApp, e se você aceita mostrá-lo a outras pessoas da escola.",
        "As identidades de acesso: a conta Google ou Apple que você usa para entrar, ou o e-mail do código de acesso.",
        "Seus pedidos de aula e a sua presença nas aulas.",
        "As avaliações (estrelas) e os comentários que você escreve sobre as aulas.",
        "As fotos das aulas em que você aparece ou que você envia.",
        "O token de notificações push do seu aparelho.",
        "O idioma que você escolheu.",
      ],
    },
    purposes: {
      title: "Para que usamos",
      items: [
        "criar e manter a sua conta e permitir que a escola aprove o seu cadastro;",
        "organizar as aulas, os pedidos de vaga e a presença;",
        "enviar avisos sobre cadastro, aulas e lembretes pelo app e por notificações push;",
        "mostrar avaliações e comentários para melhorar as aulas;",
        "mostrar o app no seu idioma;",
        "falar com você pelo WhatsApp quando for necessário.",
      ],
    },
    retention: {
      title: "Por quanto tempo guardamos",
      items: [
        "Enquanto a sua conta existir, guardamos os dados dela.",
        "Conta excluída: apagamos os seus dados pessoais 30 dias depois da exclusão. Nesse período você pode pedir para reativá-la.",
        "Conta removida pela escola: apagamos os dados pessoais 30 dias depois da remoção.",
        "Cadastro negado: apagamos tudo 30 dias depois da negativa.",
        "Dados de convidados em uma aula: apagados 30 dias depois da aula.",
        "Ao apagar, o histórico da escola fica sem o seu nome: as notas em estrelas, as aulas e as fotos continuam, e a pessoa aparece como \"Ex-aluno\" ou \"Ex-instrutor\".",
      ],
    },
    services: {
      title: "Quem trata os dados",
      intro: "Usamos estes serviços para fazer o app funcionar:",
      items: [
        "Google: login com a conta Google e o Google Maps para mostrar o local das aulas.",
        "Apple: login com a conta Apple.",
        "Resend: envia o e-mail com o código de acesso (recebe o seu e-mail e o código).",
        "Expo: entrega as notificações push (recebe o token do aparelho e o texto da notificação).",
        "Um serviço de hospedagem em nuvem, onde ficam o app e o banco de dados.",
        "Um serviço de modelo de linguagem (IA), que recebe apenas os detalhes da aula e o texto da regra de cancelamento, nunca dados pessoais.",
        "Um serviço de armazenamento de fotos compatível com S3, onde ficam as fotos das aulas.",
      ],
    },
    rights: {
      title: "Seus direitos",
      text: "Você pode pedir acesso, correção ou exclusão dos seus dados quando quiser. Para excluir a sua conta, veja a página de exclusão de conta ou fale com a escola.",
      deletionLink: "Como excluir a sua conta",
    },
    site: {
      title: "Este site",
      text: "Este site não usa cookies, não tem rastreamento nem análise de acessos.",
    },
    controller: {
      title: "Quem é o responsável",
      text: "A Rocha's Surf School é a responsável pelos seus dados. Para qualquer dúvida sobre privacidade, fale com a escola:",
      contactLabel: "WhatsApp",
    },
  },
} satisfies Dictionary;
