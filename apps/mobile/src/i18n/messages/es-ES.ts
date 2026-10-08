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
    errors: {
      invalidEmail:
        "Ese correo no parece válido. Revísalo e inténtalo de nuevo.",
      tooManyAttempts:
        "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
      sendFailed: "No pudimos enviar el correo. Inténtalo de nuevo.",
      noConnection: "Sin conexión. Revisa tu internet e inténtalo de nuevo.",
      generic: "Algo salió mal. Inténtalo de nuevo.",
    },
  },
  confirmCode: {
    title: "Confirma tu correo",
    description:
      "Enviamos un código de 6 dígitos a <bold>{{email}}</bold>. Caduca en 10 minutos.",
    inputLabel: "Código de 6 dígitos",
    submit: "Confirmar",
    resend: "Reenviar código",
    resendIn: "Reenviar código en {{time}}",
    notReceived:
      "¿No te llegó? Revisa la carpeta de spam o <change>cambia el correo</change>.",
    errors: {
      wrongCode: "Código incorrecto. Inténtalo de nuevo.",
      expired: "Este código caducó. Pide uno nuevo.",
      locked: "Demasiados intentos fallidos. Pide un código nuevo.",
      nameNotSaved: "No pudimos guardar tu nombre. Vuelve y revísalo.",
    },
  },
};

export default messages;
