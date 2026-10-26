import { buildLocation } from "../classes.test-utils";

import {
  emitLocationCreated,
  emitLocationRemoved,
  subscribeLocationEvents,
} from "./location-events";

const subscribe = () => {
  const handlers = { onCreated: jest.fn(), onRemoved: jest.fn() };
  const unsubscribe = subscribeLocationEvents(handlers);

  return { handlers, unsubscribe };
};

describe("location events", () => {
  it("tells every subscriber about a created location", () => {
    const first = subscribe();
    const second = subscribe();
    const location = buildLocation({ id: "l-9" });

    emitLocationCreated(location);

    expect(first.handlers.onCreated).toHaveBeenCalledWith(location);
    expect(second.handlers.onCreated).toHaveBeenCalledWith(location);
    expect(first.handlers.onRemoved).not.toHaveBeenCalled();
    first.unsubscribe();
    second.unsubscribe();
  });

  it("tells every subscriber about a removed location", () => {
    const { handlers, unsubscribe } = subscribe();

    emitLocationRemoved("l-1");

    expect(handlers.onRemoved).toHaveBeenCalledWith("l-1");
    expect(handlers.onCreated).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("stops telling a subscriber that left", () => {
    const { handlers, unsubscribe } = subscribe();

    unsubscribe();
    emitLocationCreated(buildLocation());
    emitLocationRemoved("l-1");

    expect(handlers.onCreated).not.toHaveBeenCalled();
    expect(handlers.onRemoved).not.toHaveBeenCalled();
  });

  it("does nothing with nobody listening", () => {
    expect(() => emitLocationRemoved("l-1")).not.toThrow();
  });
});
