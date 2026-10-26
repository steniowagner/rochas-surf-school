import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
  within,
} from "@testing-library/react-native";
import {
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
} from "expo-location";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Platform, StyleSheet } from "react-native";

import { useKeyboardHeight } from "@/hooks/use-keyboard-height.hook";
import * as api from "@/services/api";

import {
  buildLocation,
  createQueryClient,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../classes.test-utils";
import { ClassLocation } from "../classes.types";
import { subscribeLocationEvents } from "../utils/location-events";
import { LOCATIONS_QUERY_KEY } from "../utils/locations-cache";
import { FORTALEZA, MAP_DELTA, PREVIEW_DELTA } from "../utils/map";

import { LocationFormScreen } from "./location-form.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// The global sheet mock always renders its content; this one renders it only while visible.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, children }: any) =>
      visible ? <View>{children}</View> : null,
  };
});

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

jest.mock("expo-router", () => ({
  Stack: {
    // Renders the header's title, so the tests can reach the search field the screen puts there.
    Screen: jest.fn(
      ({ options }: { options: { headerTitle?: () => unknown } }) =>
        options.headerTitle?.() ?? null,
    ),
  },
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("expo-router/react-navigation", () => ({
  useHeaderHeight: jest.fn(() => 100),
}));

const { mockAnimateToRegion } = jest.requireMock("react-native-maps");
const mockReverseGeocode = jest.mocked(reverseGeocodeAsync);
const mockRequestPermission = jest.mocked(requestForegroundPermissionsAsync);
const mockPosition = jest.mocked(getCurrentPositionAsync);
const mockParams = useLocalSearchParams as jest.Mock;

const stored = buildLocation({
  id: "l-1",
  name: "Praia do Futuro",
  address: "Av. Zezé Diogo, 5000",
  latitude: -3.7442,
  longitude: -38.4617,
  upcomingClasses: 3,
});
const iracema = buildLocation({
  id: "l-9",
  name: "Iracema",
  address: "Rua dos Tabajaras, 1",
  latitude: -3.7221,
  longitude: -38.5153,
});
const created = buildLocation({
  id: "l-2",
  name: "Praia de Iracema",
  address: "Rua dos Tabajaras, 1",
});
const TAP = { latitude: -3.7253, longitude: -38.4891 };
const SUGGESTION = {
  placeId: "p1",
  title: "Praia do Futuro",
  description: "Fortaleza - CE",
};
const PLACE = {
  address: "Av. Zezé Diogo, 5000 – Fortaleza",
  latitude: -3.7442,
  longitude: -38.4617,
  name: "Praia do Futuro",
};
const GONE = "This location is no longer available.";
const DUPLICATE = "A location with this name already exists.";
const GENERIC = "Something went wrong. Please try again.";

type Handler = (init?: { method?: string; body?: string }) => unknown;

const failure = (status: number, key?: string) => () => ({
  ok: false,
  status,
  json: async () => ({ errors: key ? [key] : [] }),
});

const serve = (
  locations: ClassLocation[],
  overrides: Record<string, Handler> = {},
) => {
  const routes: Record<string, Handler> = {
    "GET /locations": () => ok({ items: locations }),
    ...overrides,
  };

  fetchMock.mockImplementation(
    async (url: string, init?: { method?: string; body?: string }) => {
      const handler =
        routes[
          `${init?.method ?? "GET"} ${String(url).replace("http://api.test", "")}`
        ];

      if (!handler) {
        throw new Error(`unexpected request ${init?.method} ${url}`);
      }

      return handler(init);
    },
  );
};

/** Opens the screen with the list already cached, as the class form leaves it; `id` opens "Editar local". */
async function renderScreen({
  locations = [stored],
  id,
  cached = true,
  overrides = {},
}: {
  locations?: ClassLocation[];
  id?: string;
  cached?: boolean;
  overrides?: Record<string, Handler>;
} = {}) {
  mockParams.mockReturnValue(id ? { id } : {});
  serve(locations, overrides);
  const queryClient = createQueryClient();

  if (cached) {
    queryClient.setQueryData(LOCATIONS_QUERY_KEY, { items: locations });
  }

  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const view = await render(
    <QueryClientProvider client={queryClient}>
      <LocationFormScreen />
    </QueryClientProvider>,
  );

  return { ...view, queryClient, invalidate };
}

const map = () => screen.getByTestId("location-form-map");
const pin = () => screen.queryByTestId("location-form-pin");
const nameInput = () => screen.getByLabelText("Name");
const searchField = () =>
  screen.getByLabelText("Search for an address or a beach");
const submit = () => screen.getByRole("button", { name: /^Save( location)?$/ });
const removeButtons = () =>
  screen.getAllByRole("button", { name: "Remove location" });

const tapMap = (point = TAP) =>
  act(() => map().props.onPress({ nativeEvent: { coordinate: point } }));

const typeName = (name: string) => fireEvent.changeText(nameInput(), name);

const sentBody = (method: string, path: string) =>
  JSON.parse(
    fetchMock.mock.calls.find(
      ([url, init]) =>
        url === `http://api.test${path}` && init?.method === method,
    )![1].body,
  );

const listenToEvents = () => {
  const handlers = { onCreated: jest.fn(), onRemoved: jest.fn() };
  const unsubscribe = subscribeLocationEvents(handlers);

  return { ...handlers, unsubscribe };
};

let events: ReturnType<typeof listenToEvents>;

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockClear();
  (router.back as jest.Mock).mockClear();
  (Stack.Screen as unknown as jest.Mock).mockClear();
  mockReverseGeocode.mockReset().mockResolvedValue([]);
  mockAnimateToRegion.mockClear();
  mockRequestPermission.mockClear();
  mockPosition.mockClear();
  events = listenToEvents();
});

afterEach(() => events.unsubscribe());

describe("LocationFormScreen (new)", () => {
  it("opens on the map under a transparent header with the search, the panel and nothing picked", async () => {
    await renderScreen();

    expect(Stack.Screen).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
        }),
      }),
      undefined,
    );
    expect(searchField().props.placeholder).toBe(
      "Search for an address or a beach",
    );
    expect(map().props.initialRegion).toEqual({
      ...FORTALEZA,
      latitudeDelta: MAP_DELTA,
      longitudeDelta: MAP_DELTA,
    });
    // The map isn't controlled: feeding its region back would drift it under the padding.
    expect(map().props.region).toBeUndefined();
    expect(pin()).toBeNull();
    expect(screen.getByText("New location")).toBeTruthy();
    expect(screen.getByText("Tap the map to mark the point")).toBeTruthy();
    expect(nameInput().props.value).toBe("");
    expect(nameInput().props.maxLength).toBe(40);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(submit()).toBeDisabled();
    expect(screen.queryByText("Edit location")).toBeNull();
    expect(screen.queryByText("Remove location")).toBeNull();
    expect(
      screen.queryByText(
        "Tell the students and instructors of upcoming classes?",
      ),
    ).toBeNull();
  });

  it("stacks the actions and keeps the panel flush with the bottom of the screen", async () => {
    await renderScreen();

    expect(
      within(screen.getByTestId("location-form-actions"))
        .getAllByRole("button")
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(["Save location", "Cancel"]);
    const panel = screen.getByTestId("location-form-panel");
    expect(panel.props.className).toContain("rounded-t-sheet");
    expect(StyleSheet.flatten(panel.props.style).paddingBottom).toBe(16);
  });

  it("lifts the panel with the keyboard", async () => {
    jest.mocked(useKeyboardHeight).mockReturnValue({ get: () => 300 } as never);
    try {
      await renderScreen();

      expect(
        StyleSheet.flatten(
          screen.getByTestId("location-form-panel").parent!.props.style,
        ).transform,
      ).toEqual([{ translateY: -300 }]);
    } finally {
      jest.mocked(useKeyboardHeight).mockReturnValue({ get: () => 0 } as never);
    }
  });

  it("asks for no location permission when it opens", async () => {
    await renderScreen();

    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(map().props.showsUserLocation).toBe(false);
  });

  it("keeps the map clear of the header and of the panel, once the map is ready", async () => {
    await renderScreen();

    // Google Maps crashes on a padding set before it is ready.
    expect(map().props.mapPadding).toBeUndefined();

    await act(() => map().props.onMapReady());
    await act(() =>
      screen
        .getByTestId("location-form-panel")
        .props.onLayout({ nativeEvent: { layout: { height: 320 } } }),
    );

    expect(map().props.mapPadding).toEqual({
      top: 100,
      right: 0,
      bottom: 320,
      left: 0,
    });
  });

  it("moves the pin to a tap, shows the device's address, and saves once named", async () => {
    mockReverseGeocode.mockResolvedValue([
      { formattedAddress: "Rua dos Tabajaras, 1 - Fortaleza" } as never,
    ]);
    fetchMock.mockClear();
    await renderScreen({
      overrides: { "POST /locations": () => ({ ...ok(created), status: 201 }) },
    });

    await tapMap();

    expect(pin()!.props.coordinate).toEqual(TAP);
    expect(screen.getByText("Rua dos Tabajaras, 1 - Fortaleza")).toBeTruthy();
    expect(
      screen.getByText("Point picked on the map · -3.7253, -38.4891"),
    ).toBeTruthy();
    // A tap doesn't move the map: the finger is already there.
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
    expect(submit()).toBeDisabled();

    await typeName("  Praia de Iracema ");
    expect(submit()).toBeEnabled();

    await userEvent.setup().press(submit());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sentBody("POST", "/locations")).toEqual({
      name: "Praia de Iracema",
      address: "Rua dos Tabajaras, 1 - Fortaleza",
      latitude: TAP.latitude,
      longitude: TAP.longitude,
    });
    expect(events.onCreated).toHaveBeenCalledWith(created);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("saves the coordinates as the address when the device finds none", async () => {
    await renderScreen({
      overrides: { "POST /locations": () => ({ ...ok(created), status: 201 }) },
    });

    await tapMap();
    await typeName("Ponto");

    expect(screen.getByText("-3.7253, -38.4891")).toBeTruthy();

    await userEvent.setup().press(submit());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sentBody("POST", "/locations").address).toBe("-3.7253, -38.4891");
  });

  it("keeps Save off while the tapped point's address is looked up", async () => {
    let answer: (value: never[]) => void = () => undefined;
    mockReverseGeocode.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    await renderScreen();
    await typeName("Ponto");

    await act(async () => {
      void map().props.onPress({ nativeEvent: { coordinate: TAP } });
    });

    expect(pin()!.props.coordinate).toEqual(TAP);
    expect(screen.getByText("Looking up the address…")).toBeTruthy();
    expect(submit()).toBeDisabled();

    await act(async () => answer([]));

    expect(submit()).toBeEnabled();
  });

  describe("search", () => {
    beforeEach(() => {
      jest.useFakeTimers({
        doNotFake: ["nextTick", "setImmediate", "queueMicrotask"],
      });
    });
    afterEach(() => jest.useRealTimers());

    const search = async (text: string) => {
      await fireEvent.changeText(searchField(), text);
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
    };

    const suggestionsRoute = (query: string) =>
      expect.stringMatching(
        new RegExp(
          `^/locations/address-suggestions\\?q=${query}&sessionToken=[0-9a-f-]{36}&language=en$`,
        ),
      );

    it("picks a suggestion: the pin and the map move there, the card and an empty Nome are filled", async () => {
      fetchMock.mockClear();
      await renderScreen({ locations: [] });
      // The session token is random: answer any suggestions and place request.
      const base = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url: string, init) => {
        if (String(url).includes("/address-suggestions?")) {
          return ok({ items: [SUGGESTION] });
        }
        if (String(url).includes("/address-suggestions/p1?")) {
          return ok(PLACE);
        }
        return base(url, init);
      });

      await search("praia");
      await waitFor(() =>
        expect(screen.getByLabelText("Praia do Futuro, Fortaleza - CE")),
      );
      await fireEvent.press(
        screen.getByLabelText("Praia do Futuro, Fortaleza - CE"),
      );

      await waitFor(() =>
        expect(
          screen.getByText("Praia do Futuro · -3.7442, -38.4617"),
        ).toBeTruthy(),
      );
      expect(screen.getByText("Av. Zezé Diogo, 5000 – Fortaleza")).toBeTruthy();
      expect(pin()!.props.coordinate).toEqual({
        latitude: -3.7442,
        longitude: -38.4617,
      });
      // The map zooms in on the picked place.
      expect(mockAnimateToRegion).toHaveBeenLastCalledWith({
        latitude: -3.7442,
        longitude: -38.4617,
        latitudeDelta: PREVIEW_DELTA,
        longitudeDelta: PREVIEW_DELTA,
      });
      expect(nameInput().props.value).toBe("Praia do Futuro");
      expect(screen.queryByTestId("location-suggestions")).toBeNull();
      expect(submit()).toBeEnabled();

      // The suggestions and the place share the screen's session.
      const paths = requestedPaths().filter((path) =>
        path.includes("address-suggestions"),
      );
      expect(paths[0]).toEqual(suggestionsRoute("praia"));
      const token = paths[0].match(/sessionToken=([^&]+)/)![1];
      expect(paths[1]).toBe(
        `/locations/address-suggestions/p1?sessionToken=${token}&language=en`,
      );
    });

    it("keeps the name that was typed, and a later tap replaces the suggestion's address", async () => {
      await renderScreen({ locations: [] });
      const base = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url: string, init) => {
        if (String(url).includes("/address-suggestions?")) {
          return ok({ items: [SUGGESTION] });
        }
        if (String(url).includes("/address-suggestions/p1?")) {
          return ok(PLACE);
        }
        return base(url, init);
      });
      await typeName("Meu pico");

      await search("praia");
      await waitFor(() =>
        expect(screen.getByLabelText("Praia do Futuro, Fortaleza - CE")),
      );
      await fireEvent.press(
        screen.getByLabelText("Praia do Futuro, Fortaleza - CE"),
      );
      await waitFor(() =>
        expect(
          screen.getByText("Praia do Futuro · -3.7442, -38.4617"),
        ).toBeTruthy(),
      );
      expect(nameInput().props.value).toBe("Meu pico");

      await tapMap();

      expect(screen.queryByText("Av. Zezé Diogo, 5000 – Fortaleza")).toBeNull();
      expect(
        screen.getByText("Point picked on the map · -3.7253, -38.4891"),
      ).toBeTruthy();
      expect(nameInput().props.value).toBe("Meu pico");
    });
  });

  it.each(["praia do futuro", "PRÁIA DO FUTURO"])(
    "shows the duplicate message and keeps the button off for the loaded name %s",
    async (name) => {
      await renderScreen();
      await tapMap();
      await typeName(name);

      expect(screen.getByText(DUPLICATE)).toBeTruthy();
      expect(submit()).toBeDisabled();
    },
  );

  it("keeps the button off without a name", async () => {
    await renderScreen();
    await tapMap();
    await typeName("   ");

    expect(submit()).toBeDisabled();
  });

  it("shows the same message, and reloads the list, when the backend answers 409", async () => {
    const { invalidate } = await renderScreen({
      locations: [],
      overrides: {
        "POST /locations": failure(409, "location.name.duplicate"),
      },
    });
    await tapMap();
    await typeName("Praia do Futuro");

    await userEvent.setup().press(submit());

    await waitFor(() => expect(screen.getByText(DUPLICATE)).toBeTruthy());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LOCATIONS_QUERY_KEY });
    expect(router.back).not.toHaveBeenCalled();
    expect(submit()).toBeDisabled();

    await typeName("Praia do Futuro 2");

    expect(screen.queryByText(DUPLICATE)).toBeNull();
    expect(submit()).toBeEnabled();
  });

  it("stays, with what was filled and a toast, on any other failure", async () => {
    await renderScreen({ overrides: { "POST /locations": failure(500) } });
    await tapMap();
    await typeName("Praia de Iracema");

    await userEvent.setup().press(submit());

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(GENERIC));
    expect(router.back).not.toHaveBeenCalled();
    expect(events.onCreated).not.toHaveBeenCalled();
    expect(nameInput().props.value).toBe("Praia de Iracema");
    expect(pin()!.props.coordinate).toEqual(TAP);
  });

  it("shows nothing when the session expired", async () => {
    (api.apiPost as jest.Mock).mockRejectedValueOnce(
      new api.SessionExpiredError(),
    );
    await renderScreen();
    await tapMap();
    await typeName("Praia de Iracema");

    await userEvent.setup().press(submit());

    await waitFor(() => expect(api.apiPost).toHaveBeenCalled());
    expect(mockShow).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("goes back without saving on Cancel", async () => {
    await renderScreen();
    await tapMap();
    await typeName("Praia de Iracema");

    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Cancel" }));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toEqual([]);
    expect(events.onCreated).not.toHaveBeenCalled();
  });

  it("ignores a second press while the first is sending", async () => {
    let finish: (value: unknown) => void = () => undefined;
    await renderScreen({
      overrides: {
        "POST /locations": () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      },
    });
    await tapMap();
    await typeName("Praia de Iracema");
    const user = userEvent.setup();

    await user.press(submit());
    await user.press(submit());
    await act(async () => finish({ ...ok(created), status: 201 }));

    await waitFor(() => expect(events.onCreated).toHaveBeenCalledTimes(1));
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toHaveLength(1);
  });

  describe("my location", () => {
    const DEVICE = { latitude: -3.8, longitude: -38.45 };

    it("asks for the permission on the tap, centres the map on the device and shows the user dot, without moving the pin", async () => {
      mockPosition.mockResolvedValueOnce({ coords: DEVICE } as never);
      await renderScreen();
      await tapMap();

      await userEvent
        .setup()
        .press(screen.getByRole("button", { name: "My location" }));

      await waitFor(() =>
        expect(mockAnimateToRegion).toHaveBeenCalledWith({
          ...DEVICE,
          latitudeDelta: MAP_DELTA,
          longitudeDelta: MAP_DELTA,
        }),
      );
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
      expect(map().props.showsUserLocation).toBe(true);
      expect(pin()!.props.coordinate).toEqual(TAP);
      expect(mockShow).not.toHaveBeenCalled();
    });

    it("shows the toast and leaves the map as it was when the permission is denied", async () => {
      mockRequestPermission.mockResolvedValueOnce({
        status: "denied",
        granted: false,
      } as never);
      await renderScreen();

      await userEvent
        .setup()
        .press(screen.getByRole("button", { name: "My location" }));

      await waitFor(() =>
        expect(mockShow).toHaveBeenCalledWith(
          "Allow location access in Settings to use your position.",
        ),
      );
      expect(mockAnimateToRegion).not.toHaveBeenCalled();
      expect(map().props.showsUserLocation).toBe(false);

      // The map and its taps keep working.
      await tapMap();
      expect(pin()!.props.coordinate).toEqual(TAP);
    });
  });

  describe("labelled places", () => {
    afterEach(() => {
      Platform.OS = "ios";
    });

    it("listens to place taps only on Android (Google Maps)", async () => {
      await renderScreen();
      expect(map().props.onPoiClick).toBeUndefined();

      Platform.OS = "android";
      await renderScreen();
      expect(map().props.onPoiClick).toEqual(expect.any(Function));
    });

    it("selects a tapped place like a suggestion on Android", async () => {
      Platform.OS = "android";
      await renderScreen({ locations: [] });
      const base = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url: string, init) =>
        String(url).includes("/address-suggestions/ChIJ-poi?")
          ? ok(PLACE)
          : base(url, init),
      );

      await act(() =>
        map().props.onPoiClick({
          nativeEvent: {
            placeId: "ChIJ-poi",
            name: "Praia do Futuro",
            coordinate: TAP,
          },
        }),
      );

      expect(
        screen.getByText("Praia do Futuro · -3.7442, -38.4617"),
      ).toBeTruthy();
      expect(nameInput().props.value).toBe("Praia do Futuro");
      expect(pin()!.props.coordinate).toEqual({
        latitude: -3.7442,
        longitude: -38.4617,
      });
      expect(mockAnimateToRegion).toHaveBeenLastCalledWith({
        latitude: -3.7442,
        longitude: -38.4617,
        latitudeDelta: PREVIEW_DELTA,
        longitudeDelta: PREVIEW_DELTA,
      });
    });
  });
});

describe("LocationFormScreen (edit)", () => {
  const point = { latitude: -3.7442, longitude: -38.4617 };

  it("opens filled with the location: title, name, address, pin, Save and Remove", async () => {
    await renderScreen({ id: "l-1", locations: [stored, iracema] });

    expect(screen.getByText("Edit location")).toBeTruthy();
    expect(nameInput().props.value).toBe("Praia do Futuro");
    expect(screen.getByText("Av. Zezé Diogo, 5000")).toBeTruthy();
    expect(
      screen.getByText("Praia do Futuro · -3.7442, -38.4617"),
    ).toBeTruthy();
    expect(pin()!.props.coordinate).toEqual(point);
    expect(map().props.initialRegion).toEqual({
      ...point,
      latitudeDelta: MAP_DELTA,
      longitudeDelta: MAP_DELTA,
    });
    expect(submit()).toBeEnabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
    expect(removeButtons()).toHaveLength(1);
    expect(
      within(screen.getByTestId("location-form-actions"))
        .getAllByRole("button")
        .map((button) => button.props.accessibilityLabel),
    ).toEqual(["Save", "Cancel", "Remove location"]);
  });

  it("fills the form, and opens the map again on the location, when the list arrives after the screen opened", async () => {
    let answer: (value: unknown) => void = () => undefined;
    await renderScreen({
      id: "l-1",
      cached: false,
      overrides: {
        "GET /locations": () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      },
    });

    expect(nameInput().props.value).toBe("");
    expect(map().props.initialRegion).toMatchObject(FORTALEZA);
    await act(() => map().props.onMapReady());
    expect(map().props.mapPadding).toBeDefined();

    await act(async () => answer(ok({ items: [stored] })));
    await waitFor(() =>
      expect(nameInput().props.value).toBe("Praia do Futuro"),
    );
    expect(pin()!.props.coordinate).toEqual(point);
    expect(map().props.initialRegion).toMatchObject(point);
    // The new map gets its padding only once it is ready too.
    expect(map().props.mapPadding).toBeUndefined();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("opens a location without a point on Fortaleza and keeps Save off until the point is set", async () => {
    const old = buildLocation({ id: "l-1", latitude: null, longitude: null });
    await renderScreen({ id: "l-1", locations: [old] });

    expect(pin()).toBeNull();
    expect(screen.getByText("Tap the map to mark the point")).toBeTruthy();
    expect(map().props.initialRegion).toMatchObject(FORTALEZA);
    expect(submit()).toBeDisabled();

    await tapMap();

    expect(submit()).toBeEnabled();
  });

  it("offers to tell the people of upcoming classes, ticked, and sends the choice", async () => {
    await renderScreen({
      id: "l-1",
      overrides: { "PUT /locations/l-1": () => ok(stored) },
    });
    const user = userEvent.setup();

    expect(
      screen.getByText("3 upcoming classes use this location."),
    ).toBeTruthy();
    const notify = screen.getByRole("checkbox", {
      name: "Tell the students and instructors of upcoming classes?",
    });
    expect(notify.props.accessibilityState.checked).toBe(true);

    await user.press(notify);
    await user.press(submit());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sentBody("PUT", "/locations/l-1")).toEqual({
      name: "Praia do Futuro",
      address: "Av. Zezé Diogo, 5000",
      ...point,
      notify: false,
    });
    expect(mockShow).toHaveBeenCalledWith("Location updated");
    expect(events.onCreated).not.toHaveBeenCalled();
  });

  it("says '1 upcoming class' in the singular and sends notify: true when left ticked", async () => {
    const one = { ...stored, upcomingClasses: 1 };
    await renderScreen({
      id: "l-1",
      locations: [one],
      overrides: { "PUT /locations/l-1": () => ok(one) },
    });

    expect(
      screen.getByText("1 upcoming class uses this location."),
    ).toBeTruthy();

    await userEvent.setup().press(submit());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sentBody("PUT", "/locations/l-1").notify).toBe(true);
  });

  it("hides the notice and sends no notify when no class uses the location", async () => {
    const idle = { ...stored, upcomingClasses: 0 };
    await renderScreen({
      id: "l-1",
      locations: [idle],
      overrides: { "PUT /locations/l-1": () => ok(idle) },
    });

    expect(
      screen.queryByText(
        "Tell the students and instructors of upcoming classes?",
      ),
    ).toBeNull();

    await userEvent.setup().press(submit());

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(sentBody("PUT", "/locations/l-1")).not.toHaveProperty("notify");
  });

  it("does not call its own name a duplicate, but another location's", async () => {
    await renderScreen({ id: "l-1", locations: [stored, iracema] });

    await typeName("PRAIA DO FUTURO");
    expect(screen.queryByText(DUPLICATE)).toBeNull();
    expect(submit()).toBeEnabled();

    await typeName("iracema");
    expect(screen.getByText(DUPLICATE)).toBeTruthy();
    expect(submit()).toBeDisabled();
  });

  it.each([
    [409, "location.archived"],
    [404, "location.notFound"],
  ])(
    "says the location is gone, reloads, goes back and clears it on %s %s",
    async (status, key) => {
      const { invalidate } = await renderScreen({
        id: "l-1",
        overrides: { "PUT /locations/l-1": failure(status, key) },
      });

      await userEvent.setup().press(submit());

      await waitFor(() => expect(events.onRemoved).toHaveBeenCalledWith("l-1"));
      expect(mockShow).toHaveBeenCalledWith(GONE);
      expect(mockShow).toHaveBeenCalledTimes(1);
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: LOCATIONS_QUERY_KEY,
      });
      expect(router.back).toHaveBeenCalledTimes(1);
    },
  );

  it("asks to confirm the removal and sends nothing when the admin keeps the location", async () => {
    await renderScreen({ id: "l-1" });
    const user = userEvent.setup();

    await user.press(removeButtons()[0]);

    expect(screen.getByText("Remove location?")).toBeTruthy();
    expect(
      screen.getByText(
        "The 3 classes that already use this location stay as they are.",
      ),
    ).toBeTruthy();

    await user.press(screen.getByRole("button", { name: "Keep" }));

    expect(screen.queryByText("Remove location?")).toBeNull();
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === "POST"),
    ).toEqual([]);
    expect(router.back).not.toHaveBeenCalled();
  });

  it("removes the location after the confirmation: toast, out of the list, back, and the class form told", async () => {
    const { queryClient } = await renderScreen({
      id: "l-1",
      overrides: {
        "POST /locations/l-1/archive": () => ({
          ok: true,
          status: 204,
          json: async () => undefined,
        }),
      },
    });
    const user = userEvent.setup();

    await user.press(removeButtons()[0]);
    await user.press(removeButtons()[1]);

    await waitFor(() => expect(events.onRemoved).toHaveBeenCalledWith("l-1"));
    expect(mockShow).toHaveBeenCalledWith("Praia do Futuro removed");
    // Leaving the list is not "gone" news.
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(
      queryClient.getQueryData<{ items: unknown[] }>(LOCATIONS_QUERY_KEY)
        ?.items,
    ).toEqual([]);
  });

  it("treats a location already removed as gone", async () => {
    await renderScreen({
      id: "l-1",
      overrides: {
        "POST /locations/l-1/archive": failure(409, "location.archived"),
      },
    });
    const user = userEvent.setup();

    await user.press(removeButtons()[0]);
    await user.press(removeButtons()[1]);

    await waitFor(() => expect(events.onRemoved).toHaveBeenCalledWith("l-1"));
    expect(mockShow).toHaveBeenCalledWith(GONE);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("stays, with a toast, when the removal fails otherwise", async () => {
    await renderScreen({
      id: "l-1",
      overrides: { "POST /locations/l-1/archive": failure(500) },
    });
    const user = userEvent.setup();

    await user.press(removeButtons()[0]);
    await user.press(removeButtons()[1]);

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(GENERIC));
    expect(events.onRemoved).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(screen.queryByText("Remove location?")).toBeNull();
    expect(nameInput().props.value).toBe("Praia do Futuro");
  });

  it("says the location is gone and goes back when the id isn't among the active locations", async () => {
    await renderScreen({ id: "l-404", locations: [stored] });

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(GONE));
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("says the location is gone and goes back when the list can't be loaded", async () => {
    await renderScreen({
      id: "l-1",
      cached: false,
      overrides: { "GET /locations": failure(500) },
    });

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith(GONE));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
