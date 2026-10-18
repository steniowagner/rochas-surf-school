import type { Stack } from "expo-router";
import type { ComponentProps } from "react";

export type StackHeaderOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack>["screenOptions"]>,
  (...args: never[]) => unknown
>;
