import { StyleSheet, type ViewStyle } from "react-native";

import { useHeaderInset } from "./header-inset.hook";
import { useKeyboardOffset } from "./keyboard-offset.hook";

type Node = {
  props?: { style?: unknown; contentInsetAdjustmentBehavior?: string };
  children?: (Node | string)[] | null;
} | null;

/** Every `paddingTop` set in a rendered tree (`screen.toJSON()`). */
export const topPaddingsOf = (tree: unknown): number[] => {
  const walk = (node: Node | Node[] | string): number[] => {
    if (!node || typeof node === "string") {
      return [];
    }
    if (Array.isArray(node)) {
      return node.flatMap(walk);
    }
    const style = StyleSheet.flatten(node.props?.style as ViewStyle) as
      ViewStyle | undefined;
    const paddingTop = style?.paddingTop;
    return [
      ...(typeof paddingTop === "number" ? [paddingTop] : []),
      ...walk(node.children as Node[]),
    ];
  };

  return walk(tree as Node);
};

/** Every `contentInsetAdjustmentBehavior` set in a rendered tree (`screen.toJSON()`): the scroll views' behavior. */
export const insetBehaviorsOf = (tree: unknown): string[] => {
  const walk = (node: Node | Node[] | string | null): string[] => {
    if (!node || typeof node === "string") {
      return [];
    }
    if (Array.isArray(node)) {
      return node.flatMap(walk);
    }
    const behavior = node.props?.contentInsetAdjustmentBehavior;
    return [...(behavior ? [behavior] : []), ...walk(node.children as Node[])];
  };

  return walk(tree as Node);
};

/** Runs `ui` as if the transparent header (iOS 26+) were showing: the header's height as inset, no keyboard offset. */
export const underTransparentHeader = async <T>(
  height: number,
  ui: () => Promise<T>,
): Promise<T> => {
  jest.mocked(useHeaderInset).mockReturnValue(height);
  jest.mocked(useKeyboardOffset).mockReturnValue(0);

  try {
    return await ui();
  } finally {
    jest.mocked(useHeaderInset).mockReturnValue(0);
    jest.mocked(useKeyboardOffset).mockReturnValue(64);
  }
};
