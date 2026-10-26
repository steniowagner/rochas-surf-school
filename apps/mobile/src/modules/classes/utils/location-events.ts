import { ClassLocation } from "../classes.types";

/** What the location screen tells the class form it came from. */
export type LocationEventHandlers = {
  /** A location was created: the form selects it. */
  onCreated: (location: ClassLocation) => void;
  /** A location was removed (or found already gone): the form lets go of it if it was selected. */
  onRemoved: (id: string) => void;
};

const subscribers = new Set<LocationEventHandlers>();

/**
 * The location screen is a pushed route, so it can't call the class form's callbacks: it emits these instead, and
 * "Nova aula" / "Editar aula" listen while they are mounted.
 */
export const subscribeLocationEvents = (
  handlers: LocationEventHandlers,
): (() => void) => {
  subscribers.add(handlers);

  return () => {
    subscribers.delete(handlers);
  };
};

export const emitLocationCreated = (location: ClassLocation) =>
  subscribers.forEach((handlers) => handlers.onCreated(location));

export const emitLocationRemoved = (id: string) =>
  subscribers.forEach((handlers) => handlers.onRemoved(id));
