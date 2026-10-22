import { createElement } from "react";

import { useStackHeader } from "./stack-header.hook";
import { UserStackHeader } from "./user-stack-header";
import type { UserStackHeaderProps } from "./user-stack-header/user-stack-header.types";

/** The options of a home tab's stack (Agenda, Início): the shared header options, drawn as the user header. */
export const useUserStackHeader = ({
  banded = false,
}: UserStackHeaderProps = {}) => {
  const header = useStackHeader();

  return {
    ...header,
    header: () => createElement(UserStackHeader, { banded }),
  };
};
