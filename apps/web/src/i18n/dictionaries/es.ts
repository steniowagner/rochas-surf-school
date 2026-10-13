import type { Dictionary } from "../dictionary.types";

export const es = {
  site: {
    name: "Rocha's Surf School",
    description: "Clases de surf y skate de Rocha's Surf School",
  },
  header: {
    homeLabel: "Página de inicio",
    languageLabel: "Idioma",
  },
  footer: {
    text: "Rocha's Surf School",
  },
  home: {
    title: "Clases de surf y skate",
    description: "Aquí encontrarás la información pública de la app de Rocha's Surf School: cómo cuidamos tus datos y cómo eliminar tu cuenta.",
    privacyPolicy: {
      title: "Política de privacidad",
      description: "Qué datos recopila la app, por qué y por cuánto tiempo.",
    },
    accountDeletion: {
      title: "Eliminación de cuenta",
      description: "Cómo eliminar tu cuenta y qué pasa con tus datos.",
    },
  },
} satisfies Dictionary;
