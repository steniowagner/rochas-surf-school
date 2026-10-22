import { createElement } from "react";

import { useStackHeader } from "./stack-header.hook";
import { UserStackHeader } from "./user-stack-header";

const renderHeader = () => createElement(UserStackHeader);

/** The options of a home tab's stack (Agenda, Início): the shared header options, drawn as the user header. */
export const useUserStackHeader = () => {
  const header = useStackHeader();

  return { ...header, header: renderHeader };
};
