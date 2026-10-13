import { screen } from "expo-router/testing-library";

type Json = {
  type: string;
  props: { title?: string; pointerEvents?: string };
  children?: (Json | string)[] | null;
};

const collect = (node: Json | string | null | undefined): Json[] => {
  if (!node || typeof node === "string") {
    return [];
  }

  const own = node.type === "RNSTabsScreenIOS" ? [node] : [];

  return own.concat(...(node.children ?? []).map((child) => collect(child)));
};

const tabScreens = () => {
  const tree = screen.toJSON() as Json | Json[] | null;

  return (Array.isArray(tree) ? tree : [tree]).flatMap((node) => collect(node));
};

/** The labels of the native tab bar, left to right. */
export const tabLabels = () => tabScreens().map((tab) => tab.props.title);

/** The label of the tab that is on screen (the others are kept mounted but out of reach). */
export const selectedTabLabel = () =>
  tabScreens().find((tab) => tab.props.pointerEvents === "box-none")?.props
    .title;
