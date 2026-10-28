import enUS from "./en-US";
import esES from "./es-ES";
import ptBR from "./pt-BR";

export type { Messages } from "./en-US";

export { enUS, esES, ptBR };

export const messages = {
  "en-US": enUS,
  "es-ES": esES,
  "pt-BR": ptBR,
};

export type MessagesLocale = keyof typeof messages;
