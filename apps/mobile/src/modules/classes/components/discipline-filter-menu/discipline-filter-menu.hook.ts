import { useState } from "react";
import {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

import type { DisciplineFilterValue } from "../../classes.types";
import { BUTTON_TURN } from "../discipline-filter/discipline-filter.constants";

import type { UseDisciplineFilterMenuProps } from "./discipline-filter-menu.types";

export const useDisciplineFilterMenu = ({
  onChange,
}: UseDisciplineFilterMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // One turn for both buttons: the open one turns in as the options appear, and the closed one turns back once they go.
  const turn = useDerivedValue(() =>
    withTiming(isOpen ? BUTTON_TURN.degrees : 0, {
      duration: BUTTON_TURN.duration,
      easing: BUTTON_TURN.easing,
    }),
  );
  const buttonTurnStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get()}deg` }],
  }));

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const select = (option: DisciplineFilterValue) => {
    setIsOpen(false);
    onChange(option);
  };

  return { isOpen, open, close, select, buttonTurnStyle };
};
