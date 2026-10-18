import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import * as api from "@/services/api";

import {
  buildLocation,
  createQueryClient,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../../classes.test-utils";
import { LOCATIONS_QUERY_KEY } from "../../utils/locations-cache";

import { LocationSheet } from "./location-sheet.component";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

// Keeps every sheet's content mounted, as the library's mock does, and the props the sheet was given.
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, onClose, children }: any) => (
      <View testID="bottom-modal" visible={visible} onClose={onClose}>
        {children}
      </View>
    ),
  };
});

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

const saved = [buildLocation({ id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 5000" })];
const created = buildLocation({ id: "l-2", name: "Praia de Iracema", address: "Rua dos Tabajaras, 1" });
const TAP = { latitude: -3.7253, longitude: -38.4891 };
const SUGGESTION = { placeId: "p1", title: "Praia do Futuro", description: "Fortaleza - CE" };
const PLACE = { address: "Av. Zezé Diogo, 5000 – Fortaleza", latitude: -3.7442, longitude: -38.4617, name: "Praia do Futuro" };

const failureWith = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

async function open({
  locations = saved,
  location = null,
  onClose = jest.fn(),
  onCreated = jest.fn(),
  onRemoved = jest.fn(),
  visible = true,
}: Partial<React.ComponentProps<typeof LocationSheet>> = {}) {
  const queryClient = createQueryClient();
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const ui = (isVisible: boolean) => (
    <QueryClientProvider client={queryClient}>
      <LocationSheet
        visible={isVisible}
        locations={locations}
        location={location}
        onClose={onClose}
        onCreated={onCreated}
        onRemoved={onRemoved}
      />
    </QueryClientProvider>
  );
  const view = await render(ui(visible));

  return { ...view, ui, onClose, onCreated, onRemoved, invalidate, queryClient };
}

const nameInput = () => screen.getByLabelText("Name");
const addressInput = () => screen.getByLabelText("Address");
const map = () => screen.getByTestId("location-map-picker");
const submit = () => screen.getByRole("button", { name: /^Save( location)?$/ });

const tapMap = (point = TAP) => fireEvent(map(), "press", { nativeEvent: { coordinate: point } });

async function fill(name: string, address: string, point: typeof TAP | null = TAP) {
  const user = userEvent.setup();
  await user.type(nameInput(), name);
  await user.type(addressInput(), address);
  if (point) {
    await tapMap(point);
  }
  return user;
}

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockClear();
});

describe("LocationSheet (new)", () => {
  it("asks for a name, an address and a point, and keeps the button off until all are given", async () => {
    await open();

    expect(screen.getByText("New location")).toBeTruthy();
    expect(
      screen.getByText("Students see the name and the address, and get directions to the point on the map."),
    ).toBeTruthy();
    expect(screen.getByText("Tap the map to mark the point")).toBeTruthy();
    expect(submit()).toBeDisabled();

    await fill("Praia de Iracema", "", null);
    expect(submit()).toBeDisabled();

    await userEvent.setup().type(addressInput(), "Rua dos Tabajaras, 1");
    expect(submit()).toBeDisabled();

    await tapMap();
    expect(submit()).toBeEnabled();
    expect(screen.getByText("Tap to move the point")).toBeTruthy();
  });

  it("limits the name to 40 and the address to 200 characters", async () => {
    await open();

    expect(nameInput().props.maxLength).toBe(40);
    expect(addressInput().props.maxLength).toBe(200);
  });

  it("does not offer the notice, the removal or the edit title", async () => {
    await open();

    expect(screen.queryByText("Tell the instructors of upcoming classes?")).toBeNull();
    expect(screen.queryByText("Edit location")).toBeNull();
    expect(screen.queryByText("Remove location")).toBeNull();
  });

  it("saves the trimmed location with its point, hands it over and closes", async () => {
    fetchMock.mockResolvedValue({ ...ok(created), status: 201 });
    const { onCreated, onClose } = await open();
    const user = await fill("  Praia de Iracema ", " Rua dos Tabajaras, 1 ");

    await user.press(submit());

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({
        name: "Praia de Iracema",
        address: "Rua dos Tabajaras, 1",
        latitude: TAP.latitude,
        longitude: TAP.longitude,
      }),
    });
  });

  it.each(["praia do futuro", "PRÁIA DO FUTURO"])(
    "shows the duplicate message and keeps the button off for the loaded name %s",
    async (name) => {
      await open();

      await fill(name, "Rua A");

      expect(screen.getByText("A location with this name already exists.")).toBeTruthy();
      expect(submit()).toBeDisabled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("shows the same message, and reloads the list, when the backend answers 409", async () => {
    fetchMock.mockResolvedValue(failureWith(409, "location.name.duplicate"));
    const { onClose, invalidate } = await open({ locations: [] });
    const user = await fill("Praia do Futuro", "Rua A");

    await user.press(submit());

    await waitFor(() =>
      expect(screen.getByText("A location with this name already exists.")).toBeTruthy(),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LOCATIONS_QUERY_KEY });
    expect(onClose).not.toHaveBeenCalled();
    expect(submit()).toBeDisabled();

    await user.type(nameInput(), "2");

    expect(screen.queryByText("A location with this name already exists.")).toBeNull();
    expect(submit()).toBeEnabled();
  });

  it("keeps the sheet and its text, with a toast, on any other failure", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ errors: [] }) });
    const { onClose, onCreated } = await open();
    const user = await fill("Praia de Iracema", "Rua A");

    await user.press(submit());

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(nameInput().props.value).toBe("Praia de Iracema");
    expect(addressInput().props.value).toBe("Rua A");
  });

  it("shows nothing when the session expired", async () => {
    (api.apiPost as jest.Mock).mockRejectedValueOnce(new api.SessionExpiredError());
    const { onClose } = await open();
    const user = await fill("Praia de Iracema", "Rua A");

    await user.press(submit());

    await waitFor(() => expect(api.apiPost).toHaveBeenCalled());
    expect(mockShow).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cancels", async () => {
    const { onClose } = await open();

    await userEvent.setup().press(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("opens empty again after it was closed", async () => {
    const { rerender, ui } = await open();
    await fill("Praia de Iracema", "Rua A");

    await rerender(ui(false));
    await rerender(ui(true));

    expect(nameInput().props.value).toBe("");
    expect(addressInput().props.value).toBe("");
    expect(screen.queryByTestId("location-marker")).toBeNull();
  });

  it("ignores a second press while the first is sending", async () => {
    let finish: (value: unknown) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { onCreated } = await open();
    const user = await fill("Praia de Iracema", "Rua A");

    await user.press(submit());
    await user.press(submit());
    finish({ ...ok(created), status: 201 });

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("LocationSheet (suggestions)", () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  });
  afterEach(() => jest.useRealTimers());

  const typeAddress = async (text: string) => {
    await fireEvent(addressInput(), "focus");
    await fireEvent.changeText(addressInput(), text);
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
  };

  const answer = (suggestions: unknown, place: unknown = PLACE) =>
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("/address-suggestions/") ? ok(place) : ok({ items: suggestions }),
    );

  it("shows up to 5 suggestions for 3 or more characters and nothing for fewer", async () => {
    answer([SUGGESTION, { ...SUGGESTION, placeId: "p2", title: "Praia de Iracema" }]);
    await open();

    await typeAddress("pr");
    expect(fetchMock).not.toHaveBeenCalled();

    await typeAddress("praia");

    expect(await screen.findByText("Praia de Iracema")).toBeTruthy();
    expect(screen.getByText("Praia do Futuro")).toBeTruthy();
    expect(requestedPaths()).toEqual([
      expect.stringMatching(
        /^\/locations\/address-suggestions\?q=praia&sessionToken=[0-9a-f-]{36}&language=en$/,
      ),
    ]);
  });

  it("picking one sets the address and the point, fills an empty name and hides the rows", async () => {
    answer([SUGGESTION]);
    await open({ locations: [] });
    await typeAddress("praia");

    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(
      await screen.findByRole("button", { name: "Praia do Futuro, Fortaleza - CE" }),
    );

    await waitFor(() => expect(addressInput().props.value).toBe(PLACE.address));
    expect(nameInput().props.value).toBe("Praia do Futuro");
    expect(screen.getByTestId("location-marker").props.coordinate).toEqual({
      latitude: PLACE.latitude,
      longitude: PLACE.longitude,
    });
    expect(map().props.region).toMatchObject({ latitude: PLACE.latitude, longitude: PLACE.longitude });
    expect(screen.queryByRole("button", { name: "Praia do Futuro, Fortaleza - CE" })).toBeNull();
    expect(submit()).toBeEnabled();
    // Same session token for the suggestions and the place.
    const tokens = requestedPaths().map((path) => /sessionToken=([^&]+)/.exec(path)?.[1]);
    expect(new Set(tokens).size).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(requestedPaths()).toHaveLength(2);
  });

  it("keeps the name that was typed when a suggestion is picked", async () => {
    answer([SUGGESTION]);
    await open();
    await fireEvent.changeText(nameInput(), "Meu pico");
    await typeAddress("praia");

    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(
      await screen.findByRole("button", { name: "Praia do Futuro, Fortaleza - CE" }),
    );

    await waitFor(() => expect(addressInput().props.value).toBe(PLACE.address));
    expect(nameInput().props.value).toBe("Meu pico");
  });

  it("shows no rows and no toast when the suggestions fail, and the admin can still place the point", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({ errors: [] }) });
    await open();

    await typeAddress("praia");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await fireEvent.changeText(nameInput(), "Praia");
    await tapMap();

    expect(screen.queryByRole("button", { name: /Fortaleza/ })).toBeNull();
    expect(mockShow).not.toHaveBeenCalled();
    expect(submit()).toBeEnabled();
  });

  it("changes nothing, with no toast, when the place cannot be found", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("/address-suggestions/")
        ? { ok: false, status: 404, json: async () => ({ errors: ["location.place.notFound"] }) }
        : ok({ items: [SUGGESTION] }),
    );
    await open();
    await typeAddress("praia");

    await userEvent.setup({ advanceTimers: jest.advanceTimersByTime }).press(
      await screen.findByRole("button", { name: "Praia do Futuro, Fortaleza - CE" }),
    );

    await waitFor(() => expect(requestedPaths()).toHaveLength(2));
    expect(addressInput().props.value).toBe("praia");
    expect(screen.queryByTestId("location-marker")).toBeNull();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("asks in a new session every time the sheet opens", async () => {
    answer([SUGGESTION]);
    const { rerender, ui } = await open();
    await typeAddress("praia");
    await screen.findByText("Praia do Futuro");

    await rerender(ui(false));
    await rerender(ui(true));
    await typeAddress("praia");

    await waitFor(() => expect(requestedPaths()).toHaveLength(2));
    const [first, second] = requestedPaths().map((path) => /sessionToken=([^&]+)/.exec(path)?.[1]);
    expect(first).not.toBe(second);
  });
});

describe("LocationSheet (edit)", () => {
  const stored = buildLocation({
    id: "l-1",
    name: "Praia do Futuro",
    address: "Av. Zezé Diogo, 5000",
    latitude: -3.7442,
    longitude: -38.4617,
    upcomingClasses: 3,
  });

  const edited = (overrides = {}) => ({ ...stored, ...overrides });

  it("opens filled with the location, with the edit copy, the move hint and the remove button", async () => {
    await open({ location: stored, locations: [stored] });

    expect(screen.getByText("Edit location")).toBeTruthy();
    expect(screen.getByText("Changes also apply to the classes that already use this location.")).toBeTruthy();
    expect(nameInput().props.value).toBe("Praia do Futuro");
    expect(addressInput().props.value).toBe("Av. Zezé Diogo, 5000");
    expect(screen.getByTestId("location-marker").props.coordinate).toEqual({
      latitude: -3.7442,
      longitude: -38.4617,
    });
    expect(screen.getByText("Tap to move the point")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: "Remove location" })).toHaveLength(2);
  });

  it("opens a location without a point on Fortaleza and keeps Save off until the point is set", async () => {
    await open({ location: buildLocation({ latitude: null, longitude: null }), locations: [stored] });

    expect(map().props.region).toMatchObject({ latitude: -3.7319, longitude: -38.5267 });
    expect(screen.queryByTestId("location-marker")).toBeNull();
    expect(submit()).toBeDisabled();

    await tapMap();

    expect(submit()).toBeEnabled();
  });

  it("offers to tell the instructors, ticked, only when classes use the location, and sends the choice", async () => {
    fetchMock.mockResolvedValue(ok(edited({ address: "Rua Nova" })));
    const { onClose } = await open({ location: stored, locations: [stored] });
    const user = userEvent.setup();

    expect(screen.getByRole("checkbox", { name: "Tell the instructors of upcoming classes?" })).toBeChecked();
    expect(screen.getByText("3 upcoming classes use this location.")).toBeTruthy();

    await user.press(screen.getByRole("checkbox", { name: "Tell the instructors of upcoming classes?" }));
    await fireEvent.changeText(addressInput(), "Rua Nova");
    await user.press(submit());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations/l-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({
        name: "Praia do Futuro",
        address: "Rua Nova",
        latitude: -3.7442,
        longitude: -38.4617,
        notify: false,
      }),
    });
    expect(mockShow).toHaveBeenCalledWith("Location updated");
  });

  it("sends notify: true when left ticked, and says '1 upcoming class' in the singular", async () => {
    fetchMock.mockResolvedValue(ok(stored));
    const one = { ...stored, upcomingClasses: 1 };
    await open({ location: one, locations: [one] });

    expect(screen.getByText("1 upcoming class uses this location.")).toBeTruthy();

    await userEvent.setup().press(submit());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).notify).toBe(true);
  });

  it("hides the notice and sends no notify when no class uses the location", async () => {
    fetchMock.mockResolvedValue(ok(stored));
    const idle = { ...stored, upcomingClasses: 0 };
    await open({ location: idle, locations: [idle] });

    expect(screen.queryByRole("checkbox")).toBeNull();

    await userEvent.setup().press(submit());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("notify");
  });

  it("does not call its own name a duplicate, but another location's", async () => {
    const other = buildLocation({ id: "l-9", name: "Iracema" });
    await open({ location: stored, locations: [stored, other] });

    await fireEvent.changeText(nameInput(), "PRAIA DO FUTURO");
    expect(screen.queryByText("A location with this name already exists.")).toBeNull();
    expect(submit()).toBeEnabled();

    await fireEvent.changeText(nameInput(), "iracema");
    expect(screen.getByText("A location with this name already exists.")).toBeTruthy();
    expect(submit()).toBeDisabled();
  });

  it.each([
    [409, "location.archived"],
    [404, "location.notFound"],
  ])("says the location is gone, reloads and closes on %s %s", async (status, key) => {
    fetchMock.mockResolvedValue(failureWith(status, key));
    const { onClose, onRemoved, invalidate } = await open({ location: stored, locations: [stored] });

    await userEvent.setup().press(submit());

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("This location is no longer available."));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LOCATIONS_QUERY_KEY });
    expect(onClose).toHaveBeenCalled();
    expect(onRemoved).toHaveBeenCalledWith("l-1");
  });

  it("steps the edit sheet aside for the confirmation and ignores that dismissal, which is not the admin closing it", async () => {
    const onClose = jest.fn();
    await open({ location: stored, locations: [stored], onClose });
    const editSheet = () => screen.getAllByTestId("bottom-modal")[0];

    expect(editSheet().props.visible).toBe(true);

    await userEvent.setup().press(screen.getAllByRole("button", { name: "Remove location" })[0]);

    expect(editSheet().props.visible).toBe(false);
    await act(async () => editSheet().props.onClose());
    expect(onClose).not.toHaveBeenCalled();

    await userEvent.setup().press(screen.getByRole("button", { name: "Keep" }));

    expect(editSheet().props.visible).toBe(true);
    await act(async () => editSheet().props.onClose());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks to confirm the removal and sends nothing when the admin keeps the location", async () => {
    await open({ location: stored, locations: [stored] });
    const user = userEvent.setup();

    await user.press(screen.getAllByRole("button", { name: "Remove location" })[0]);
    await user.press(screen.getByRole("button", { name: "Keep" }));

    expect(screen.getByText("The 3 classes that already use this location stay as they are.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes the location after the confirmation: toast, sheet closed, selection told", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => undefined });
    const { onClose, onRemoved, queryClient } = await open({ location: stored, locations: [stored] });
    queryClient.setQueryData(LOCATIONS_QUERY_KEY, { items: [stored] });
    const user = userEvent.setup();

    await user.press(screen.getAllByRole("button", { name: "Remove location" })[0]);
    await user.press(screen.getAllByRole("button", { name: "Remove location" })[1]);

    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith("l-1"));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations/l-1/archive", expect.objectContaining({ method: "POST" }));
    expect(mockShow).toHaveBeenCalledWith("Praia do Futuro removed");
    expect(onClose).toHaveBeenCalled();
    expect(queryClient.getQueryData<{ items: unknown[] }>(LOCATIONS_QUERY_KEY)?.items).toEqual([]);
  });

  it("treats a location already removed as gone, and keeps the sheet on any other failure", async () => {
    const { onClose, onRemoved } = await open({ location: stored, locations: [stored] });
    const user = userEvent.setup();

    fetchMock.mockResolvedValueOnce(failureWith(409, "location.archived"));
    await user.press(screen.getAllByRole("button", { name: "Remove location" })[0]);
    await user.press(screen.getAllByRole("button", { name: "Remove location" })[1]);

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("This location is no longer available."));
    expect(onRemoved).toHaveBeenCalledWith("l-1");
    expect(onClose).toHaveBeenCalledTimes(1);

    mockShow.mockClear();
    (onRemoved as jest.Mock).mockClear();
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ errors: [] }) });
    await user.press(screen.getAllByRole("button", { name: "Remove location" })[0]);
    await user.press(screen.getAllByRole("button", { name: "Remove location" })[1]);

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(onRemoved).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
