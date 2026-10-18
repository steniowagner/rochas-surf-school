import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../../classes.test-utils";
import * as api from "@/services/api";

import { LOCATIONS_QUERY_KEY } from "../../utils/locations-cache";

import { LocationSheet } from "./location-sheet.component";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

const saved = [{ id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 5000" }];
const created = { id: "l-2", name: "Praia de Iracema", address: "Rua dos Tabajaras, 1" };

const failureWith = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

async function open({
  locations = saved,
  onClose = jest.fn(),
  onCreated = jest.fn(),
  visible = true,
}: Partial<React.ComponentProps<typeof LocationSheet>> = {}) {
  const queryClient = createQueryClient();
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const ui = (isVisible: boolean) => (
    <QueryClientProvider client={queryClient}>
      <LocationSheet
        visible={isVisible}
        locations={locations}
        onClose={onClose}
        onCreated={onCreated}
      />
    </QueryClientProvider>
  );
  const view = await render(ui(visible));

  return { ...view, ui, onClose, onCreated, invalidate, queryClient };
}

const nameInput = () => screen.getByLabelText("Name");
const addressInput = () => screen.getByLabelText("Address");
const submit = () => screen.getByRole("button", { name: "Save location" });

async function fill(name: string, address: string) {
  const user = userEvent.setup();
  await user.type(nameInput(), name);
  await user.type(addressInput(), address);
  return user;
}

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockClear();
});

describe("LocationSheet", () => {
  it("asks for a name and an address and keeps the button off until both are filled", async () => {
    await open();

    expect(screen.getByText("New location")).toBeTruthy();
    expect(screen.getByText("Students see the name and the address, and get directions to the point on the map.")).toBeTruthy();
    expect(submit()).toBeDisabled();

    await fill("Praia de Iracema", "");
    expect(submit()).toBeDisabled();

    await userEvent.setup().type(addressInput(), "Rua dos Tabajaras, 1");
    expect(submit()).toBeEnabled();
  });

  it("limits the name to 40 and the address to 200 characters", async () => {
    await open();

    expect(nameInput().props.maxLength).toBe(40);
    expect(addressInput().props.maxLength).toBe(200);
  });

  it("saves the trimmed location, hands it over and closes", async () => {
    fetchMock.mockResolvedValue({ ...ok(created), status: 201 });
    const { onCreated, onClose } = await open();
    const user = await fill("  Praia de Iracema ", " Rua dos Tabajaras, 1 ");

    await user.press(submit());

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(onClose).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer at-1" },
      body: JSON.stringify({ name: "Praia de Iracema", address: "Rua dos Tabajaras, 1" }),
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
