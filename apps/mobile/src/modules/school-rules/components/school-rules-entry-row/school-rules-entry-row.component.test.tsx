import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";

import {
  createQueryClient,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { SchoolRulesEntryRow } from "./school-rules-entry-row.component";
import { SchoolRulesEntryRowRole } from "./school-rules-entry-row.types";

jest.useFakeTimers();

const rules = (count: number) => ({
  version: 1,
  rules: Array.from({ length: count }, (_, index) => ({
    id: `r-${index}`,
    title: `Rule ${index}`,
    description: `Explanation ${index}`,
    index: index + 1,
  })),
});

beforeEach(setupSignedInUser);

async function renderRow(role: SchoolRulesEntryRowRole, onPress = jest.fn()) {
  await render(
    <QueryClientProvider client={createQueryClient()}>
      <SchoolRulesEntryRow role={role} onPress={onPress} />
    </QueryClientProvider>,
  );

  return { onPress, user: userEvent.setup() };
}

describe("SchoolRulesEntryRow", () => {
  it.each([
    ["admin", 6, "6 rules in students' onboarding"],
    ["admin", 1, "1 rule in students' onboarding"],
    ["admin", 0, "No rules yet"],
    ["instructor", 6, "6 rules for every student"],
    ["instructor", 1, "1 rule for every student"],
    ["instructor", 0, "No rules yet"],
  ] as const)(
    "shows Rules for the %s with %s rules as %s",
    async (role, count, subtitle) => {
      fetchMock.mockResolvedValue(ok(rules(count)));
      await renderRow(role);

      expect(screen.getByText("Rules")).toBeOnTheScreen();
      expect(await screen.findByText(subtitle)).toBeOnTheScreen();
      expect(fetchMock).toHaveBeenCalledWith(
        "http://api.test/school-rules",
        expect.objectContaining({ method: "GET" }),
      );
    },
  );

  it("shows no subtitle while the rules load, and still opens", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    const { onPress, user } = await renderRow("admin");

    expect(screen.getByText("Rules")).toBeOnTheScreen();
    expect(screen.queryByText(/rule|No rules/)).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: /Rules/ }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows no subtitle after the rules failed to load, and still opens", async () => {
    fetchMock.mockResolvedValue(failure());
    const { onPress, user } = await renderRow("instructor");

    await user.press(screen.getByRole("button", { name: /Rules/ }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/rule|No rules/)).not.toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
