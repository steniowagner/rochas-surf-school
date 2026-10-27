import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { SchoolRuleSheet } from "./school-rule-sheet.component";
import { SchoolRuleSheetProps } from "./school-rule-sheet.types";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.useFakeTimers();

const RULE = {
  id: "r-2",
  title: "Bring sunscreen",
  description: "Put it on before every class.",
  index: 2,
};
const ANSWER = { version: 2, rules: [RULE] };
const SAVE_NOTE = "Once saved, everyone will need to accept the rules again the next time they open the app.";

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

async function open(overrides: Partial<SchoolRuleSheetProps> = {}) {
  const queryClient = createQueryClient();
  const props: SchoolRuleSheetProps = {
    visible: true,
    mode: "add",
    rule: null,
    onClose: jest.fn(),
    onDelete: jest.fn(),
    ...overrides,
  };
  const ui = (visible: boolean) => (
    <QueryClientProvider client={queryClient}>
      <SchoolRuleSheet {...props} visible={visible} />
    </QueryClientProvider>
  );
  const view = await render(ui(props.visible));

  return {
    props,
    user: userEvent.setup(),
    rerender: (visible: boolean) => view.rerender(ui(visible)),
  };
}

const titleInput = () => screen.getByLabelText("Title");
const descriptionInput = () => screen.getByLabelText("Explanation");
const button = (name: string) => screen.getByRole("button", { name });

describe("SchoolRuleSheet — add", () => {
  it("opens empty with the save note and no checkbox or switch", async () => {
    await open();

    expect(screen.getByText("New rule")).toBeOnTheScreen();
    expect(screen.getByText(SAVE_NOTE)).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("E.g. Bring sunscreen")).toBeOnTheScreen();
    expect(
      screen.getByPlaceholderText("One or two short sentences, speaking straight to the student."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    expect(screen.queryByRole("switch")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Delete rule" })).not.toBeOnTheScreen();
  });

  it("keeps Add rule off until both fields have text after trimming", async () => {
    const { user } = await open();

    expect(button("Add rule")).toBeDisabled();

    await user.type(titleInput(), "   ");
    await user.type(descriptionInput(), "Every class.");
    expect(button("Add rule")).toBeDisabled();

    await user.type(titleInput(), "Bring sunscreen");
    expect(button("Add rule")).toBeEnabled();

    await user.clear(descriptionInput());
    await user.type(descriptionInput(), "  ");
    expect(button("Add rule")).toBeDisabled();
  });

  it("limits the title to 60 and the explanation to 300 characters, with their counters", async () => {
    const { user } = await open();

    expect(titleInput()).toHaveProp("maxLength", 60);
    expect(descriptionInput()).toHaveProp("maxLength", 300);
    expect(screen.getByText("0/60")).toBeOnTheScreen();
    expect(screen.getByText("0/300")).toBeOnTheScreen();

    await user.type(titleInput(), "Wax");
    await user.type(descriptionInput(), "Bring it.");

    expect(screen.getByText("3/60")).toBeOnTheScreen();
    expect(screen.getByText("9/300")).toBeOnTheScreen();
  });

  it("sends only the trimmed title and explanation, closes and shows Rule added", async () => {
    fetchMock.mockResolvedValue(ok(ANSWER));
    const { props, user } = await open();

    await user.type(titleInput(), "  Bring sunscreen ");
    await user.type(descriptionInput(), " Every class. ");
    await user.press(button("Add rule"));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/school-rules",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Bring sunscreen", description: "Every class." }),
      }),
    );
    expect(mockShow).toHaveBeenCalledWith("Rule added", { tone: "success" });
  });

  it("sends one request on a double tap", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { user } = await open();

    await user.type(titleInput(), "Bring sunscreen");
    await user.type(descriptionInput(), "Every class.");
    await user.press(button("Add rule"));
    await user.press(button("Add rule"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the sheet and the draft when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const { props, user } = await open();

    await user.type(titleInput(), "Bring sunscreen");
    await user.type(descriptionInput(), "Every class.");
    await user.press(button("Add rule"));

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again."),
    );
    expect(props.onClose).not.toHaveBeenCalled();
    expect(titleInput()).toHaveDisplayValue("Bring sunscreen");
    expect(descriptionInput()).toHaveDisplayValue("Every class.");
  });

  it("closes with Cancel and sends nothing", async () => {
    const { props, user } = await open();

    await user.type(titleInput(), "Bring sunscreen");
    await user.press(button("Cancel"));

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops the draft when it opens again", async () => {
    const { rerender, user } = await open();

    await user.type(titleInput(), "Bring sunscreen");
    await rerender(false);
    expect(titleInput()).toHaveDisplayValue("Bring sunscreen");
    await rerender(true);

    expect(titleInput()).toHaveDisplayValue("");
  });
});

describe("SchoolRuleSheet — edit", () => {
  it("opens with the rule's text, the save note and Delete rule, and no checkbox or switch", async () => {
    await open({ mode: "edit", rule: RULE });

    expect(screen.getByText("Edit rule")).toBeOnTheScreen();
    expect(titleInput()).toHaveDisplayValue(RULE.title);
    expect(descriptionInput()).toHaveDisplayValue(RULE.description);
    expect(screen.getByText(SAVE_NOTE)).toBeOnTheScreen();
    expect(screen.getByText("15/60")).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    expect(screen.queryByRole("switch")).not.toBeOnTheScreen();
    expect(button("Delete rule")).toBeOnTheScreen();
  });

  it("keeps Save off while the trimmed text is the stored one or a field is blank", async () => {
    const { user } = await open({ mode: "edit", rule: RULE });

    expect(button("Save")).toBeDisabled();

    await user.type(titleInput(), " ");
    expect(button("Save")).toBeDisabled();

    await user.type(descriptionInput(), " Always.");
    expect(button("Save")).toBeEnabled();

    await user.clear(titleInput());
    expect(button("Save")).toBeDisabled();
  });

  it("enables Save when only the title changed", async () => {
    const { user } = await open({ mode: "edit", rule: RULE });

    await user.type(titleInput(), "!");

    expect(button("Save")).toBeEnabled();
  });

  it("sends the trimmed text to the rule, closes and shows Rule saved", async () => {
    fetchMock.mockResolvedValue(ok(ANSWER));
    const { props, user } = await open({ mode: "edit", rule: RULE });

    await user.type(descriptionInput(), " Always. ");
    await user.press(button("Save"));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/school-rules/r-2",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ title: RULE.title, description: `${RULE.description} Always.` }),
      }),
    );
    expect(mockShow).toHaveBeenCalledWith("Rule saved", { tone: "success" });
  });

  it("closes and says the rule was already deleted when it no longer exists", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ errors: ["schoolRule.id.notFound"] }),
    });
    const { props, user } = await open({ mode: "edit", rule: RULE });

    await user.type(titleInput(), "!");
    await user.press(button("Save"));

    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
    expect(mockShow).toHaveBeenCalledWith("This rule was already deleted.");
  });

  it("keeps the sheet and the draft on another failure", async () => {
    fetchMock.mockResolvedValue(failure());
    const { props, user } = await open({ mode: "edit", rule: RULE });

    await user.type(titleInput(), "!");
    await user.press(button("Save"));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(props.onClose).not.toHaveBeenCalled();
    expect(titleInput()).toHaveDisplayValue(`${RULE.title}!`);
  });

  it("hands the rule to onDelete with Delete rule, sending nothing", async () => {
    const { props, user } = await open({ mode: "edit", rule: RULE });

    await user.press(button("Delete rule"));

    expect(props.onDelete).toHaveBeenCalledWith(RULE);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
