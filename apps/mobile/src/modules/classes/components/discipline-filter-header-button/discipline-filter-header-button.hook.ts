import { useState } from "react";

import type { DisciplineFilterValue } from "../../classes.types";

import type { UseDisciplineFilterHeaderButtonProps } from "./discipline-filter-header-button.types";

export const useDisciplineFilterHeaderButton = ({
  onChange,
}: UseDisciplineFilterHeaderButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const select = (option: DisciplineFilterValue) => {
    setIsOpen(false);
    onChange(option);
  };

  return { isOpen, open, close, select };
};
