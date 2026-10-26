import { useEffect, useRef } from "react";
import { Keyboard, LayoutChangeEvent } from "react-native";
import type Animated from "react-native-reanimated";

import { useHeaderInset } from "@/navigation/stack-header";

import { NoticeField } from "../notices.types";

// Space left above a field scrolled into view.
const FIELD_SCROLL_MARGIN = 16;

/**
 * The ref of a scroll view, and the handlers that scroll a focused field to just below the header once the keyboard is
 * up. Pair it with `automaticallyAdjustKeyboardInsets` on the scroll view.
 */
export const useScrollFieldIntoView = () => {
  const headerInset = useHeaderInset();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const fieldTops = useRef<Record<NoticeField, number>>({ title: 0, message: 0 });
  const keyboardListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => () => keyboardListener.current?.remove(), []);

  const onFieldLayout = (field: NoticeField, event: LayoutChangeEvent) => {
    fieldTops.current[field] = event.nativeEvent.layout.y;
  };

  const scrollToField = (field: NoticeField) =>
    scrollRef.current?.scrollTo({
      y: Math.max(fieldTops.current[field] - headerInset - FIELD_SCROLL_MARGIN, 0),
      animated: true,
    });

  // The keyboard avoidance only grows the scrollable area once the keyboard is up: scrolling before it would stop short.
  const onFieldFocus = (field: NoticeField) => {
    keyboardListener.current?.remove();

    if (Keyboard.isVisible()) {
      scrollToField(field);

      return;
    }

    keyboardListener.current = Keyboard.addListener("keyboardDidShow", () => {
      keyboardListener.current?.remove();
      keyboardListener.current = null;
      scrollToField(field);
    });
  };

  return { scrollRef, onFieldLayout, onFieldFocus };
};
