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
    controller: {
      title: "Quem é o responsável",
      text: "A Rocha's Surf School é a responsável pelos seus dados. Para qualquer dúvida sobre privacidade, fale com a escola.",
      legalNameLabel: "Razão social",
      cnpjLabel: "CNPJ",
      whatsappLabel: "WhatsApp",
    },
    dpo: {
      title: "Encarregado pela proteção de dados",
      text: "O encarregado é o canal de comunicação entre você, a escola e a ANPD (Autoridade Nacional de Proteção de Dados).",
      nameLabel: "Nome",
      emailLabel: "E-mail",
    },
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
  },
  accountDeletion: {
    metaTitle: "Exclusão de conta",
    metaDescription: "Como excluir a sua conta da Rocha's Surf School e o que acontece com os seus dados.",
    title: "Exclusão de conta",
    description: "Veja como excluir a sua conta da Rocha's Surf School, o que é apagado e o que fica sem o seu nome.",
    inApp: {
      title: "Se você tem o app",
      text: "Abra o app e vá em Perfil → Excluir conta. Depois, confirme a exclusão.",
    },
    noApp: {
      title: "Se você não tem mais o app",
      text: "Fale com a escola pelo WhatsApp e peça a exclusão. Um administrador atende o pedido removendo a sua conta.",
      numberLabel: "WhatsApp da escola",
      button: "Falar com a escola no WhatsApp",
    },
    erased: {
      title: "O que é apagado",
      intro: "Apagamos os seus dados pessoais:",
      items: [
        "nome;",
        "e-mail;",
        "foto;",
        "número de WhatsApp;",
        "comentários.",
      ],
    },
    kept: {
      title: "O que fica sem o seu nome",
      intro: "O histórico da escola continua, sem identificar você:",
      items: [
        "as notas em estrelas;",
        "as aulas e as fotos, que mostram \"Ex-aluno\" ou \"Ex-instrutor\" no lugar da pessoa.",
      ],
    },
    timing: {
      title: "Quando",
      text: "Apagamos esses dados 30 dias depois da exclusão ou da remoção da conta.",
    },
  },
} satisfies Dictionary;
