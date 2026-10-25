import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { insetBehaviorsOf } from "@/navigation/stack-header/header-inset.test-utils";

import {
  account,
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "@/modules/profile/profile.test-utils";

import { CancellationRulesScreen } from "./cancellation-rules.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the header's title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => <>{options.headerTitle()}</>,
  },
}));
jest.useFakeTimers();

const fetchMock = setupFetch();

const SURF = "O aluno pode cancelar até 12 horas antes do início da aula.";

const open = async (rules = { surf: SURF, skate: null as string | null }) => {
  fetchMock.mockResolvedValue(jsonResponse(200, rules));
  seedSession(account({ role: "admin" }));
  await renderWithProviders(<CancellationRulesScreen />);
  await screen.findByDisplayValue(rules.surf ?? "");

  return userEvent.setup();
};

const saveButton = (discipline = "surf") =>
  screen.getByRole("button", { name: `Save rule for ${discipline}` });
const field = () => screen.getByPlaceholderText(/Students can cancel without penalty/);

describe("CancellationRulesScreen", () => {
  beforeEach(() => jest.mocked(router.back).mockClear());

  it("opens on surf with the saved text, the note in force and the save button off (cancellation rules)", async () => {
    await open();

    expect(screen.getByRole("header", { name: "Cancellation rules" })).toBeOnTheScreen();
    expect(screen.getByText(/never the students'/)).toBeOnTheScreen();
    expect(screen.getByText(/Give exact deadlines in hours/)).toBeOnTheScreen();
    expect(screen.getByText(/Avoid ambiguity/)).toBeOnTheScreen();
    expect(screen.getByDisplayValue(SURF)).toBeOnTheScreen();
    expect(screen.getByText("Current rule for surf")).toBeOnTheScreen();
    expect(screen.getByText(`${SURF.length}/2000`)).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("insets its content below the header, whatever the header is", async () => {
    await open();

    expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
  });

  it("marks unsaved changes and turns the button on, off again when back to the saved text (cancellation rules)", async () => {
    const user = await open();

    await user.type(field(), "!");

    expect(screen.getByText("Unsaved changes")).toBeOnTheScreen();
    expect(saveButton()).toBeEnabled();

    await user.clear(field());
    await user.type(field(), `  ${SURF}  `);

    expect(screen.getByText("Current rule for surf")).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("keeps the draft of each discipline while switching (cancellation rules)", async () => {
    const user = await open();

    await user.type(field(), " Mais.");
    await user.press(screen.getByRole("tab", { name: "Skate" }));

    expect(screen.getByText("No rule for skate yet")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("")).toBeOnTheScreen();
    expect(saveButton("skate")).toBeDisabled();

    await user.type(field(), "Skate draft");
    await user.press(screen.getByRole("tab", { name: "Surf" }));

    expect(screen.getByDisplayValue(`${SURF} Mais.`)).toBeOnTheScreen();

    await user.press(screen.getByRole("tab", { name: "Skate" }));

    expect(screen.getByDisplayValue("Skate draft")).toBeOnTheScreen();
  });

  it("saves the rule, shows the toast, stays on the screen and goes back to in force (cancellation rules)", async () => {
    const user = await open();
    await user.type(field(), " Mais.");
    fetchMock.mockResolvedValue(jsonResponse(200, { surf: `${SURF} Mais.`, skate: null }));

    await user.press(saveButton());

    expect(await screen.findByText("Rule for surf saved")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenLastCalledWith("http://api.test/cancellation-rules/surf", {
      method: "PUT",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
      body: JSON.stringify({ text: `${SURF} Mais.` }),
    });
    await waitFor(() => expect(screen.getByText("Current rule for surf")).toBeOnTheScreen());
    expect(saveButton()).toBeDisabled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("keeps the draft and shows a toast when the save fails (cancellation rules)", async () => {
    const user = await open();
    await user.type(field(), " Mais.");
    fetchMock.mockResolvedValue(jsonResponse(500, { errors: [] }));

    await user.press(saveButton());

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeOnTheScreen();
    expect(screen.getByDisplayValue(`${SURF} Mais.`)).toBeOnTheScreen();
    expect(screen.getByText("Unsaved changes")).toBeOnTheScreen();
  });

  it("keeps the button off for a blank draft (cancellation rules)", async () => {
    const user = await open();

    await user.clear(field());
    await user.type(field(), "   ");

    expect(screen.getByText("Unsaved changes")).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();
  });

  it("limits the field to 2000 characters (cancellation rules)", async () => {
    await open();

    expect(field().props.maxLength).toBe(2000);
  });

  it("shows a loading state, with the title in the header and no form, while the rules load", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    seedSession(account({ role: "admin" }));
    await renderWithProviders(<CancellationRulesScreen />);

    expect(screen.getByTestId("cancellation-rules-loading")).toBeOnTheScreen();
    expect(screen.getByLabelText("Loading the rule")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "CANCELLATION RULES" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: /Save rule/ })).toBeNull();
  });

  it("shows the error with Try again, which reloads (cancellation rules)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { errors: [] }));
    seedSession(account({ role: "admin" }));
    await renderWithProviders(<CancellationRulesScreen />);
    const user = userEvent.setup();

    expect(await screen.findByText("Couldn't load the rules")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "CANCELLATION RULES" })).toBeOnTheScreen();
    expect(screen.queryByText(/never the students'/)).toBeNull();
    fetchMock.mockResolvedValue(jsonResponse(200, { surf: SURF, skate: null }));
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByDisplayValue(SURF)).toBeOnTheScreen();
  });
});
