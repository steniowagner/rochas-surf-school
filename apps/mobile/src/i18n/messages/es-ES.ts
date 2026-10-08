import type { Messages } from "./en-US";

const messages: Messages = {
  language: {
    button: "Idioma",
    title: "Idioma",
    description: "Elige el idioma de la app.",
  },
  common: {
    close: "Cerrar",
    back: "Volver",
  },
  auth: {
    continueWithApple: "Continuar con Apple",
    continueWithGoogle: "Continuar con Google",
    continueWithEmail: "Continuar con email",
    terms:
      "Al continuar, aceptas nuestros <terms>Términos de uso</terms> y la <privacy>Política de privacidad</privacy>.",
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
  },
};

export default messages;
