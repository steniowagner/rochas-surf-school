import type { ReactElement, ReactNode } from "react";

/** The title a screen gave the Stack header as `headerTitle: () => <StackHeaderTitle title=… />`. */
export const headerTitleOf = (
  headerTitle?: () => ReactNode,
): string | undefined =>
  (headerTitle?.() as ReactElement<{ title: string }> | undefined)?.props.title;
