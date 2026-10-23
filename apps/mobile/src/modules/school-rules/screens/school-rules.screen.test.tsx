import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import { insetBehaviorsOf } from "@/navigation/stack-header/header-inset.test-utils";
import {
  jsonResponse,
  renderWithProviders,
  seedSession,
  setupFetch,
} from "@/modules/profile/profile.test-utils";

import { SchoolRulesReadScreen } from "./school-rules.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  // Renders the header's title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => <>{options.headerTitle()}</>,
  },
}));
jest.useFakeTimers();

const fetchMock = setupFetch();

const ruleOf = (position: number) => ({
  id: `rule-${position}`,
  title: `Title ${position}`,
  description: `Description ${position}`,
  index: position - 1,
});

const open = async () => {
  seedSession();
  await renderWithProviders(<SchoolRulesReadScreen />);
};

describe("SchoolRulesReadScreen", () => {
  beforeEach(() => jest.mocked(router.back).mockClear());

  it("shows the title, the description and the numbered rules, read-only", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { version: 3, rules: [ruleOf(1), ruleOf(2)] }),
    );
    await open();

    expect(
      screen.getByRole("header", { name: "SCHOOL RULES" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Few and simple, so classes go well for everyone."),
    ).toBeOnTheScreen();
    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    expect(screen.getByText("Description 2")).toBeOnTheScreen();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /accept|enter/i })).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/school-rules");
  });

  it("insets its content below the header, whatever the header is", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { version: 3, rules: [ruleOf(1)] }),
    );
    await open();

    expect(insetBehaviorsOf(screen.toJSON())).toContain("automatic");
  });

  it("shows a loading state while the rules load", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await open();

    expect(screen.queryByText("Couldn't load the rules.")).toBeNull();
    expect(screen.queryByText("The school has no rules yet.")).toBeNull();
    expect(screen.queryByText("Title 1")).toBeNull();
  });

  it("shows the error and loads again on Try again", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { errors: [] }));
    await open();

    expect(
      await screen.findByText("Couldn't load the rules."),
    ).toBeOnTheScreen();

    fetchMock.mockResolvedValue(
      jsonResponse(200, { version: 1, rules: [ruleOf(1)] }),
    );
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Title 1")).toBeOnTheScreen();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("shows the empty message when the school has no rules", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { version: 0, rules: [] }));
    await open();

    expect(
      await screen.findByText("The school has no rules yet."),
    ).toBeOnTheScreen();
  });
});
