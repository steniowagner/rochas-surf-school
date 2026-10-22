import { useState } from "react";
import {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";

import type { DisciplineFilterValue } from "../../classes.types";

import { BUTTON_TURN } from "./discipline-filter.constants";
import type { UseDisciplineFilterProps } from "./discipline-filter.types";

export const useDisciplineFilter = ({ onChange }: UseDisciplineFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const turn = useDerivedValue(() =>
    withTiming(isOpen ? BUTTON_TURN.degrees : 0, {
      duration: BUTTON_TURN.duration,
      easing: BUTTON_TURN.easing,
    }),
  );
  const buttonTurnStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get()}deg` }],
  }));

  const toggle = () => setIsOpen((open) => !open);
  const close = () => setIsOpen(false);
  const select = (option: DisciplineFilterValue) => {
    setIsOpen(false);
    onChange(option);
  };

  return { isOpen, toggle, close, select, buttonTurnStyle };
};
