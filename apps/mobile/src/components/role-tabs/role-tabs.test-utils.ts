import { screen } from "expo-router/testing-library";

type Json = {
  type: string;
  props: { title?: string; pointerEvents?: string };
  children?: (Json | string)[] | null;
};

const collect = (node: Json | string): Json[] =>
  typeof node === "string"
    ? []
    : [
        ...(node.type === "RNSTabsScreenIOS" ? [node] : []),
        ...(node.children ?? []).flatMap(collect),
      ];

const tabScreens = () =>
  [screen.toJSON() as Json | Json[]].flat().flatMap(collect);

/** The labels of the native tab bar, left to right. */
export const tabLabels = () => tabScreens().map((tab) => tab.props.title);

/** The label of the tab that is on screen (the others are kept mounted but out of reach). */
export const selectedTabLabel = () =>
  tabScreens().find((tab) => tab.props.pointerEvents === "box-none")?.props
    .title;
