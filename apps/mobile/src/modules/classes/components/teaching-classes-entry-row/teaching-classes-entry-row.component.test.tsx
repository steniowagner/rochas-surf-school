import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";

import i18n from "@/i18n";

import {
  buildClassItem,
  createQueryClient,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "../../classes.test-utils";
import { TeachingClassesEntryRow } from "./teaching-classes-entry-row.component";
import type { TeachingClassesEntryRowRole } from "./teaching-classes-entry-row.types";

// The callback the row gave `useFocusEffect`, run by a test when the home is focused again.
let focusEffect: () => (() => void) | void = () => undefined;

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => (() => void) | void) => {
    focusEffect = effect;
  },
}));

const classes = (count: number, cancelled = 0) => [
  ...Array.from({ length: count }, (_, index) =>
    buildClassItem(`c-${index}`, "2026-10-15T11:00:00.000Z", "2026-10-15T12:00:00.000Z"),
  ),
  ...Array.from({ length: cancelled }, (_, index) =>
    buildClassItem(`x-${index}`, "2026-10-16T11:00:00.000Z", "2026-10-16T12:00:00.000Z", {
      cancelledAt: "2026-10-10T12:00:00.000Z",
    }),
  ),
];

const answer = (items: ReturnType<typeof classes>, teachesAny = items.length > 0) => ok({ items, teachesAny });

async function renderRow(role: TeachingClassesEntryRowRole, onPress = jest.fn()) {
  await render(
    <QueryClientProvider client={createQueryClient()}>
      <TeachingClassesEntryRow role={role} onPress={onPress} />
    </QueryClientProvider>,
  );

  return { onPress };
}

beforeEach(setupSignedInUser);

afterEach(async () => {
  await act(() => i18n.changeLanguage("en-US"));
});

describe("TeachingClassesEntryRow", () => {
  it.each([
    ["instructor", 3, 1, "3 classes assigned to you"],
    ["instructor", 1, 0, "1 class assigned to you"],
    ["instructor", 0, 0, "No classes assigned"],
    ["admin", 3, 1, "3 classes assigned to you"],
    ["admin", 0, 2, "No classes assigned"],
  ] as const)("shows My classes for the %s with %s classes and %s cancelled as %s", async (role, count, cancelled, subtitle) => {
    fetchMock.mockResolvedValue(answer(classes(count, cancelled), true));
    await renderRow(role);

    expect(await screen.findByText(subtitle)).toBeOnTheScreen();
    expect(screen.getByText("My classes")).toBeOnTheScreen();
    expect(requestedPaths()).toEqual(["/classes/teaching"]);
  });

  it("opens the screen when pressed", async () => {
    fetchMock.mockResolvedValue(answer(classes(1)));
    const { onPress } = await renderRow("instructor");

    await userEvent.press(await screen.findByRole("button", { name: /My classes/ }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows the instructor's row without a subtitle while loading and after an error", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await renderRow("instructor");
    expect(screen.getByText("My classes")).toBeOnTheScreen();
    expect(screen.queryByText(/assigned/)).not.toBeOnTheScreen();

    fetchMock.mockResolvedValue(failure(500));
    await renderRow("instructor");
    await waitFor(() => expect(requestedPaths()).toHaveLength(2));
    expect(screen.getByText("My classes")).toBeOnTheScreen();
    expect(screen.queryByText(/assigned/)).not.toBeOnTheScreen();
  });

  it("hides the admin's row while loading, after an error and when they teach nothing", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await renderRow("admin");
    expect(screen.queryByText("My classes")).not.toBeOnTheScreen();

    fetchMock.mockResolvedValue(failure(500));
    await renderRow("admin");
    await waitFor(() => expect(requestedPaths()).toHaveLength(2));
    expect(screen.queryByText("My classes")).not.toBeOnTheScreen();

    fetchMock.mockResolvedValue(answer([], false));
    await renderRow("admin");
    await waitFor(() => expect(requestedPaths()).toHaveLength(3));
    expect(screen.queryByText("My classes")).not.toBeOnTheScreen();
  });

  it("shows the admin's row once they teach a class, reading it again when the home is focused", async () => {
    fetchMock.mockResolvedValue(answer([], false));
    await renderRow("admin");
    await waitFor(() => expect(requestedPaths()).toHaveLength(1));
    expect(screen.queryByText("My classes")).not.toBeOnTheScreen();
    fetchMock.mockResolvedValue(answer(classes(1)));

    await act(async () => {
      focusEffect();
    });

    expect(await screen.findByText("1 class assigned to you")).toBeOnTheScreen();
    expect(requestedPaths()).toEqual(["/classes/teaching", "/classes/teaching"]);
  });

  it("is translated into Portuguese and Spanish", async () => {
    fetchMock.mockResolvedValue(answer(classes(3, 1)));
    await act(() => i18n.changeLanguage("pt-BR"));
    await renderRow("instructor");
    expect(screen.getByText("Minhas aulas")).toBeOnTheScreen();
    expect(await screen.findByText("3 aulas atribuídas a você")).toBeOnTheScreen();

    await act(() => i18n.changeLanguage("es-ES"));
    expect(screen.getByText("Mis clases")).toBeOnTheScreen();
    expect(screen.getByText("3 clases asignadas a ti")).toBeOnTheScreen();
  });

  it("says one class and none in Portuguese", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    fetchMock.mockResolvedValue(answer(classes(1)));
    await renderRow("instructor");
    expect(await screen.findByText("1 aula atribuída a você")).toBeOnTheScreen();

    fetchMock.mockResolvedValue(answer([]));
    await renderRow("instructor");
    expect(await screen.findByText("Nenhuma aula atribuída")).toBeOnTheScreen();
  });
});
