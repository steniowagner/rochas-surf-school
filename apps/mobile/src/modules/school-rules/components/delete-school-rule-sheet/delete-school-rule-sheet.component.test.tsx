import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";

import {
  createQueryClient,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { DeleteSchoolRuleSheet } from "./delete-school-rule-sheet.component";

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
const DELETE_NOTE = "Once deleted, everyone will need to accept the rules again the next time they open the app.";

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

async function open() {
  const onClose = jest.fn();
  await render(
    <QueryClientProvider client={createQueryClient()}>
      <DeleteSchoolRuleSheet visible rule={RULE} onClose={onClose} />
    </QueryClientProvider>,
  );

  return { onClose, user: userEvent.setup() };
}

const confirmButton = () => screen.getByRole("button", { name: "Delete rule" });

describe("DeleteSchoolRuleSheet", () => {
  it("asks to delete the rule by its title, with the delete note and no checkbox or switch", async () => {
    await open();

    expect(screen.getByText("Delete this rule?")).toBeOnTheScreen();
    expect(screen.getByText(RULE.title)).toBeOnTheScreen();
    expect(screen.getByText(DELETE_NOTE)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    expect(screen.queryByRole("switch")).not.toBeOnTheScreen();
  });

  it("deletes the rule without a body, closes and shows Rule deleted", async () => {
    fetchMock.mockResolvedValue(ok({ version: 3, rules: [] }));
    const { onClose, user } = await open();

    await user.press(confirmButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules/r-2", {
      method: "DELETE",
      headers: { Authorization: "Bearer at-1", "Content-Type": "application/json" },
    });
    expect(mockShow).toHaveBeenCalledWith("Rule deleted", { tone: "success" });
  });

  it("closes with Cancel and deletes nothing", async () => {
    const { onClose, user } = await open();

    await user.press(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes and says the rule was already deleted when it no longer exists", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ errors: ["schoolRule.id.notFound"] }),
    });
    const { onClose, user } = await open();

    await user.press(confirmButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mockShow).toHaveBeenCalledWith("This rule was already deleted.");
  });

  it("stays open on another failure", async () => {
    fetchMock.mockResolvedValue(failure());
    const { onClose, user } = await open();

    await user.press(confirmButton());

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(onClose).not.toHaveBeenCalled();
    expect(confirmButton()).toBeOnTheScreen();
  });

  it("stays open with the no-connection toast when the network is down", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    const { onClose, user } = await open();

    await user.press(confirmButton());

    await waitFor(() =>
      expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again."),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("sends one request on a double tap", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { user } = await open();

    await user.press(confirmButton());
    await user.press(confirmButton());

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
