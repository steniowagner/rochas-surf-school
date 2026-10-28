import type { Dictionary } from "../dictionary.types";

export const ptBr = {
  site: {
    name: "Rocha's Surf School",
    description: "Aulas de surf e skate da Rocha's Surf School",
  },
  header: {
    homeLabel: "Página inicial",
    languageLabel: "Idioma",
    themeLabel: "Alternar tema",
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
    termsOfUse: {
      title: "Termos de uso",
      description: "As regras para usar o app e o que você pode publicar.",
    },
    accountDeletion: {
      title: "Exclusão de conta",
      description: "Como excluir a sua conta e o que acontece com os seus dados.",
    },
  },
  designs: {
    metaTitle: "Designs",
    metaDescription: "Veja como o app é desenhado: o sistema de design com as cores, a tipografia e os componentes que as telas usam. Segue o tema e o idioma escolhidos no topo da página.",
    title: "Os designs do app",
    description: "Veja como o app é desenhado: o sistema de design com as cores, a tipografia e os componentes que as telas usam. Segue o tema e o idioma escolhidos no topo da página.",
    pages: { designSystem: { title: "Sistema de design", description: "As cores, a tipografia, os controles, os cartões e os estados do app." } },
  },
  privacyPolicy: {
    metaTitle: "Política de privacidade",
    metaDescription: "Quais dados o app da Rocha's Surf School coleta, por quê, por quanto tempo e quem os trata.",
    title: "Política de privacidade",
    description: "Esta política explica quais dados o app da Rocha's Surf School coleta, por que, por quanto tempo os guardamos e quais serviços os tratam.",
    lastUpdatedLabel: "Última atualização",
    lastUpdated: "13 de outubro de 2026",
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
        "As identidades de acesso: a conta Google ou Apple que você usa para entrar, ou o e-mail que recebe o código de acesso.",
        "Seus pedidos de vaga em aulas e a sua presença.",
        "As notas em estrelas e os comentários que você escreve sobre as aulas.",
        "Fotos de aulas em que você aparece ou que você envia.",
        "O token de notificações push do seu aparelho.",
        "O idioma que você escolheu.",
        "Dados de convidados: o nome e o número de WhatsApp de uma pessoa sem conta, informados por um administrador da escola para que ela possa participar de uma aula.",
      ],
    },
    purposes: {
      title: "Por que usamos, e com qual base legal",
      intro: "Cada uso dos seus dados se apoia em uma das bases legais da LGPD (Lei Geral de Proteção de Dados):",
      items: [
        "Criar e manter a sua conta, aprovar o seu cadastro, organizar as aulas e os pedidos de vaga, registrar a presença, mostrar notas e comentários e enviar avisos no app: execução de contrato (LGPD, art. 7º, V).",
        "Enviar notificações push ao seu celular e mostrar o seu número de WhatsApp a outras pessoas da escola, se você escolheu isso: o seu consentimento (LGPD, art. 7º, I). Você pode retirá-lo a qualquer momento nas configurações do celular ou do app.",
        "Manter as notas em estrelas e o histórico de aulas da escola sem o seu nome depois que os seus dados forem apagados, e guardar os dados de um convidado durante a aula que ele frequenta: o legítimo interesse da escola em manter seus registros e conduzir suas aulas (LGPD, art. 7º, IX).",
      ],
    },
    services: {
      title: "Quem trata os dados",
      intro: "Usamos estes serviços para o app funcionar:",
      items: [
        "Google: login com conta Google, Google Maps para mostrar os locais das aulas e sugestões de endereço quando administradores salvam um local (recebe o texto da busca).",
        "Apple: login com conta Apple e Apple Maps para mostrar os locais das aulas no iPhone.",
        "Resend: envia o e-mail com o código de acesso (recebe o seu e-mail e o código).",
        "Expo: entrega as notificações push (recebe o token do aparelho e o texto da notificação).",
        "Um serviço de hospedagem na nuvem, onde rodam o app e o banco de dados.",
        "Anthropic (Claude): calcula o prazo de cancelamento de cada aula; recebe apenas os detalhes da aula e o texto da regra de cancelamento, nunca dados pessoais.",
        "Um serviço de armazenamento de fotos compatível com S3, onde ficam as fotos das aulas.",
      ],
    },
    transfers: {
      title: "Transferência para fora do Brasil",
      text: "Esses serviços podem tratar dados em outros países. Quando isso acontece, a transferência segue as garantias que a LGPD permite (art. 33), como cláusulas contratuais e os compromissos de proteção de dados dos próprios provedores.",
    },
    retention: {
      title: "Por quanto tempo guardamos",
      intro: "Guardamos cada tipo de dado apenas pelo tempo necessário:",
      items: [
        "Códigos de acesso: 10 minutos.",
        "Sua sessão em um aparelho: 30 dias após o último uso do app.",
        "O token de push do aparelho: até você sair da conta nesse aparelho ou a conta ser apagada.",
        "Dados da conta: enquanto a conta existir.",
        "Conta excluída: apagamos os seus dados pessoais 30 dias após a exclusão. Nesse prazo você pode pedir a reativação da conta.",
        "Conta removida pela escola: apagamos os dados pessoais 30 dias após a remoção.",
        "Cadastro negado: apagamos tudo 30 dias após a negação.",
        "Nome e WhatsApp de convidado: apagados 30 dias após o fim ou o cancelamento da aula.",
        "Quando os dados são apagados, o histórico da escola fica sem o seu nome: as notas em estrelas continuam sem nome, e as aulas e as fotos mostram \"Ex-aluno\" ou \"Ex-instrutor\" no seu lugar.",
      ],
    },
    security: {
      title: "Como protegemos",
      intro: "Protegemos os seus dados com:",
      items: [
        "conexões criptografadas (HTTPS) entre o app e os nossos servidores;",
        "acesso limitado por perfil: cada pessoa vê apenas o que o seu perfil permite;",
        "login sem senha, com um código enviado ao seu e-mail ou com a sua conta Google ou Apple.",
      ],
    },
    adults: {
      title: "Somente para maiores de idade",
      text: "O app é para pessoas com 18 anos ou mais. Não criamos contas para menores de idade. Se descobrirmos que uma conta pertence a um menor, ela é removida e os seus dados são apagados.",
    },
    rights: {
      title: "Seus direitos",
      intro: "Pela LGPD (art. 18), você pode pedir:",
      items: [
        "a confirmação de que tratamos os seus dados;",
        "o acesso aos seus dados;",
        "a correção de dados incompletos, inexatos ou desatualizados;",
        "a anonimização, o bloqueio ou a eliminação de dados desnecessários ou excessivos;",
        "a portabilidade dos seus dados;",
        "a eliminação dos dados tratados com o seu consentimento;",
        "informação sobre com quem compartilhamos os seus dados;",
        "informação sobre a possibilidade de não dar o consentimento e as consequências disso;",
        "a revogação do seu consentimento.",
      ],
      howTo: "Para exercer qualquer um desses direitos, escreva para o encarregado, no e-mail acima, ou fale com a escola pelo WhatsApp.",
      complaint: "Você também pode fazer uma reclamação à ANPD (Autoridade Nacional de Proteção de Dados), a autoridade de proteção de dados do Brasil.",
    },
    deletion: {
      title: "Excluir a sua conta",
      text: "Você pode excluir a sua conta a qualquer momento.",
      link: "Como excluir a sua conta",
    },
    terms: {
      title: "Termos de uso",
      text: "As regras para usar o app estão nos nossos termos de uso.",
      link: "Ler os termos de uso",
    },
    site: {
      title: "Este site",
      text: "Este site não usa cookies e não tem rastreamento nem análise de uso.",
    },
    changes: {
      title: "Mudanças nesta política",
      text: "Quando esta política mudar, publicaremos a nova versão nesta página, com uma nova data de \"Última atualização\".",
    },
  },
  termsOfUse: {
    metaTitle: "Termos de uso",
    metaDescription: "As regras para usar o app da Rocha's Surf School: quem pode usar, o que você pode publicar, como denunciar conteúdo e o que os termos não cobrem.",
    title: "Termos de uso",
    description: "Estes termos explicam como você pode usar o app da Rocha's Surf School.",
    lastUpdatedLabel: "Última atualização",
    lastUpdated: "13 de outubro de 2026",
    about: {
      title: "Sobre estes termos",
      text: "Estes termos valem para o app da Rocha's Surf School. Ao usar o app, você os aceita.",
    },
    who: {
      title: "Quem pode usar o app",
      intro: "Para usar o app:",
      items: [
        "você precisa ter 18 anos ou mais;",
        "o seu cadastro precisa ser aprovado pela escola: toda conta é analisada antes de poder ser usada;",
        "as decisões dos administradores da escola no app, como aprovações, negações, perfis e remoções, são definitivas;",
        "a escola pode remover uma conta que descumpra estes termos ou as regras da escola.",
      ],
    },
    rules: {
      title: "Regras da escola",
      text: "As regras da escola que você aceita no app também valem. Elas continuam valendo para a conduta na escola, enquanto estes termos valem para o uso do app.",
    },
    content: {
      title: "O que você publica",
      intro: "Os comentários e as fotos que você publica no app devem respeitar as outras pessoas. É proibido:",
      items: [
        "assédio e intimidação;",
        "discurso de ódio;",
        "nudez e conteúdo sexual;",
        "violência;",
        "conteúdo ilegal;",
        "dados privados de outras pessoas.",
      ],
      outro: "Os administradores apagam o conteúdo que descumpre estas regras e podem remover a conta que o publicou.",
    },
    reporting: {
      title: "Denunciar conteúdo",
      text: "O app não tem botão de denúncia. Para denunciar um comentário, uma foto ou uma pessoa, fale com a escola pelo WhatsApp:",
    },
    payments: {
      title: "Pagamentos",
      text: "O app não recebe pagamentos.",
    },
    coverage: {
      title: "O que estes termos não cobrem",
      text: "Estes termos não são um termo de responsabilidade. Os riscos do surf e do skate, e os pagamentos, são tratados no acordo próprio da escola com cada aluno.",
    },
    privacy: {
      title: "Privacidade",
      text: "Como tratamos os seus dados e como excluir a sua conta estão explicados nestas páginas:",
      policyLink: "Política de privacidade",
      deletionLink: "Exclusão de conta",
    },
    changes: {
      title: "Mudanças nestes termos",
      text: "Quando estes termos mudarem, publicaremos a nova versão nesta página, com uma nova data de \"Última atualização\".",
    },
    law: {
      title: "Lei aplicável",
      text: "Estes termos são regidos pela lei brasileira.",
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
