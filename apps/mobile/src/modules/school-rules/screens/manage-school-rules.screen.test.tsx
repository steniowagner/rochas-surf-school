import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, userEvent, waitFor, within } from "@testing-library/react-native";

import {
  createQueryClient,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

import { SchoolRule } from "../school-rules.types";

import { ManageSchoolRulesScreen } from "./manage-school-rules.screen";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("expo-router", () => ({
  // Renders the header's title so the tests can see it.
  Stack: {
    Screen: ({ options }: any) => <>{options.headerTitle()}</>,
  },
}));

// A sheet shows its content only while visible, and keeps its `onClose` on a host view so a test can dismiss it the way
// the sheet library does (a drag, a backdrop tap, or the dismissal that follows `visible` turning false).
jest.mock("@/components/ui/bottom-modal", () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { View } = require("react-native");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    BottomModal: ({ visible, onClose, children }: any) => (
      <View testID="bottom-modal" visible={visible} onClose={onClose}>
        {visible ? children : null}
      </View>
    ),
  };
});

jest.useFakeTimers();

const rule = (id: string, index: number, overrides: Partial<SchoolRule> = {}): SchoolRule => ({
  id,
  title: `Rule ${id.toUpperCase()}`,
  description: `Explanation ${id.toUpperCase()}`,
  index,
  ...overrides,
});

const A = rule("a", 1);
const B = rule("b", 2);
const C = rule("c", 3);

type Handler = (body: unknown) => unknown;

type Handlers = {
  list?: () => unknown;
  create?: Handler;
  update?: Handler;
  remove?: Handler;
  order?: Handler;
};

const answer = (rules: SchoolRule[], version = 3) =>
  ok({ version, rules: rules.map((item, index) => ({ ...item, index: index + 1 })) });

const failureWith = (status: number, key: string) => ({
  ok: false,
  status,
  json: async () => ({ errors: [key] }),
});

/** Answers each endpoint with its handler; the list is A, B, C unless a handler says otherwise. */
const serve = ({ list = () => answer([A, B, C]), create, update, remove, order }: Handlers) => {
  fetchMock.mockImplementation(async (url: string, init: { method: string; body?: string }) => {
    const path = String(url).replace("http://api.test", "");
    const body = init.body ? JSON.parse(init.body) : undefined;

    if (init.method === "GET") {
      return list();
    }

    if (path === "/school-rules/order") {
      return order!(body);
    }

    if (init.method === "POST") {
      return create!(body);
    }

    if (init.method === "PUT") {
      return update!(body);
    }

    return remove!(body);
  });
};

const requests = (method: string) =>
  fetchMock.mock.calls
    .filter(([, init]) => init.method === method)
    .map(([url, init]) => ({
      path: String(url).replace("http://api.test", ""),
      body: init.body ? JSON.parse(init.body) : undefined,
    }));

beforeEach(() => {
  setupSignedInUser();
  mockShow.mockReset();
});

async function open() {
  await render(
    <QueryClientProvider client={createQueryClient()}>
      <ManageSchoolRulesScreen />
    </QueryClientProvider>,
  );

  return userEvent.setup();
}

const list = () => within(screen.getByTestId("manage-school-rules"));
const titles = () => list().queryAllByText(/^Rule /).map((node) => node.props.children);
const positions = () => list().queryAllByText(/^\d\d$/).map((node) => node.props.children);
const arrow = (name: string) => screen.getByRole("button", { name });
const ruleSheet = () => within(screen.getAllByTestId("bottom-modal")[0]);
const deleteSheet = () => within(screen.getAllByTestId("bottom-modal")[1]);
const bottomAddButton = () => list().queryByRole("button", { name: "Add rule" });

describe("ManageSchoolRulesScreen — lists", () => {
  it("lists the rules in order with the header, the intro, the arrows and Add rule", async () => {
    serve({});
    await open();

    expect(await screen.findByText("Rule A")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "School rules" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Students read these rules and must accept them before using the app. The order here is the order they see.",
      ),
    ).toBeOnTheScreen();
    expect(positions()).toEqual(["01", "02", "03"]);
    expect(titles()).toEqual(["Rule A", "Rule B", "Rule C"]);
    expect(screen.getByText("Explanation B")).toBeOnTheScreen();
    expect(arrow("Move rule 1 up")).toBeDisabled();
    expect(arrow("Move rule 1 down")).toBeEnabled();
    expect(arrow("Move rule 2 up")).toBeEnabled();
    expect(arrow("Move rule 2 down")).toBeEnabled();
    expect(arrow("Move rule 3 up")).toBeEnabled();
    expect(arrow("Move rule 3 down")).toBeDisabled();
    expect(bottomAddButton()).toBeOnTheScreen();
  });

  it("lists a single rule with both of its arrows disabled", async () => {
    serve({ list: () => answer([A]) });
    await open();

    await screen.findByText("Rule A");

    expect(arrow("Move rule 1 up")).toBeDisabled();
    expect(arrow("Move rule 1 down")).toBeDisabled();
  });

  it("lists the rules and opens Edit rule for the rule whose text is tapped", async () => {
    serve({});
    const user = await open();

    await user.press(await screen.findByText("Rule B"));

    expect(ruleSheet().getByText("Edit rule")).toBeOnTheScreen();
    expect(ruleSheet().getByLabelText("Title")).toHaveDisplayValue("Rule B");
    expect(ruleSheet().getByLabelText("Explanation")).toHaveDisplayValue("Explanation B");
  });
});

describe("ManageSchoolRulesScreen — state", () => {
  it("shows the loading state as one labelled element, without Add rule", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    await open();

    expect(screen.getByLabelText("Loading the rules")).toBeOnTheScreen();
    expect(screen.getByTestId("school-rules-loading")).toBeOnTheScreen();
    expect(bottomAddButton()).not.toBeOnTheScreen();
  });

  it("shows the error state, a failed retry shows it again and a retry that works lists the rules", async () => {
    const results = [failure(), failure(), answer([A, B])];
    serve({ list: () => results.shift() });
    const user = await open();

    expect(await screen.findByText("Couldn't load the rules")).toBeOnTheScreen();
    expect(screen.getByText("Check your connection and try again.")).toBeOnTheScreen();
    expect(bottomAddButton()).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Couldn't load the rules")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Rule B")).toBeOnTheScreen();
    expect(screen.queryByText("Couldn't load the rules")).not.toBeOnTheScreen();
  });

  it("shows the empty state, whose Add rule opens New rule, without the bottom button", async () => {
    serve({ list: () => answer([]) });
    const user = await open();

    expect(await screen.findByText("No rules yet")).toBeOnTheScreen();
    expect(
      screen.getByText("Add the first rule. Students read and accept the rules before using the app."),
    ).toBeOnTheScreen();
    expect(list().getAllByRole("button", { name: "Add rule" })).toHaveLength(1);

    await user.press(list().getByRole("button", { name: "Add rule" }));

    expect(ruleSheet().getByText("New rule")).toBeOnTheScreen();
  });
});

describe("ManageSchoolRulesScreen — adds", () => {
  it("adds a rule: sends it trimmed, closes the sheet, shows Rule added and lists it last as 03", async () => {
    const created = rule("d", 3, { title: "Rule D", description: "Explanation D" });
    serve({ list: () => answer([A, B]), create: () => answer([A, B, created]) });
    const user = await open();

    await user.press(await screen.findByRole("button", { name: "Add rule" }));
    await user.type(ruleSheet().getByLabelText("Title"), " Rule D ");
    await user.type(ruleSheet().getByLabelText("Explanation"), "Explanation D ");
    await user.press(ruleSheet().getByRole("button", { name: "Add rule" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Rule added"));
    expect(requests("POST")).toEqual([
      { path: "/school-rules", body: { title: "Rule D", description: "Explanation D" } },
    ]);
    expect(screen.queryByText("New rule")).not.toBeOnTheScreen();
    expect(titles()).toEqual(["Rule A", "Rule B", "Rule D"]);
    expect(positions()).toEqual(["01", "02", "03"]);
  });
});

describe("ManageSchoolRulesScreen — edits", () => {
  it("edits a rule: sends the new text, closes the sheet, shows Rule saved and keeps the position", async () => {
    serve({
      update: () => answer([A, { ...B, description: "New explanation" }, C]),
    });
    const user = await open();

    await user.press(await screen.findByText("Rule B"));
    await user.clear(ruleSheet().getByLabelText("Explanation"));
    await user.type(ruleSheet().getByLabelText("Explanation"), "New explanation");
    await user.press(ruleSheet().getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Rule saved"));
    expect(requests("PUT")).toEqual([
      { path: "/school-rules/b", body: { title: "Rule B", description: "New explanation" } },
    ]);
    expect(screen.queryByText("Edit rule")).not.toBeOnTheScreen();
    expect(titles()).toEqual(["Rule A", "Rule B", "Rule C"]);
    expect(list().getByText("New explanation")).toBeOnTheScreen();
  });

  it("edits a rule that was already deleted: closes the sheet, reloads the list and says so", async () => {
    const lists = [answer([A, B, C]), answer([A, C], 4)];
    serve({
      list: () => lists.shift(),
      update: () => failureWith(404, "schoolRule.id.notFound"),
    });
    const user = await open();

    await user.press(await screen.findByText("Rule B"));
    await user.type(ruleSheet().getByLabelText("Title"), "!");
    await user.press(ruleSheet().getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("This rule was already deleted."));
    await waitFor(() => expect(titles()).toEqual(["Rule A", "Rule C"]));
    expect(screen.queryByText("Edit rule")).not.toBeOnTheScreen();
  });
});

describe("ManageSchoolRulesScreen — deletes", () => {
  it("deletes rule 02 after the confirmation: the former 03 becomes 02", async () => {
    serve({ remove: () => answer([A, C], 4) });
    const user = await open();

    await user.press(await screen.findByText("Rule B"));
    await user.press(ruleSheet().getByRole("button", { name: "Delete rule" }));

    expect(screen.queryByText("Edit rule")).not.toBeOnTheScreen();
    expect(deleteSheet().getByText("Delete this rule?")).toBeOnTheScreen();
    expect(deleteSheet().getByText("Rule B")).toBeOnTheScreen();

    await user.press(deleteSheet().getByRole("button", { name: "Delete rule" }));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Rule deleted"));
    expect(requests("DELETE")).toEqual([{ path: "/school-rules/b", body: undefined }]);
    expect(screen.queryByText("Delete this rule?")).not.toBeOnTheScreen();
    expect(titles()).toEqual(["Rule A", "Rule C"]);
    expect(positions()).toEqual(["01", "02"]);
  });

  it("deletes nothing with Cancel, and the edit sheet doesn't come back", async () => {
    serve({});
    const user = await open();

    await user.press(await screen.findByText("Rule B"));
    await user.press(ruleSheet().getByRole("button", { name: "Delete rule" }));
    await user.press(deleteSheet().getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Delete this rule?")).not.toBeOnTheScreen();
    expect(screen.queryByText("Edit rule")).not.toBeOnTheScreen();
    expect(requests("DELETE")).toEqual([]);
    expect(titles()).toEqual(["Rule A", "Rule B", "Rule C"]);
  });

  it("keeps the confirmation open when the edit sheet reports its dismissal late", async () => {
    serve({});
    const user = await open();

    await user.press(await screen.findByText("Rule B"));
    await user.press(ruleSheet().getByRole("button", { name: "Delete rule" }));
    await act(async () => {
      fireEvent(screen.getAllByTestId("bottom-modal")[0], "close");
    });

    expect(deleteSheet().getByText("Delete this rule?")).toBeOnTheScreen();
  });

  it("deletes the last rule and shows the empty state", async () => {
    serve({ list: () => answer([A]), remove: () => answer([], 4) });
    const user = await open();

    await user.press(await screen.findByText("Rule A"));
    await user.press(ruleSheet().getByRole("button", { name: "Delete rule" }));
    await user.press(deleteSheet().getByRole("button", { name: "Delete rule" }));

    expect(await screen.findByText("No rules yet")).toBeOnTheScreen();
  });
});

describe("ManageSchoolRulesScreen — reorders", () => {
  it("reorders at once, disables every arrow until the answer and keeps the answer's order, without a toast", async () => {
    let settle: (value: unknown) => void = () => undefined;
    serve({
      order: () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    });
    const user = await open();

    await screen.findByText("Rule A");
    await user.press(arrow("Move rule 2 down"));

    expect(titles()).toEqual(["Rule A", "Rule C", "Rule B"]);
    for (const position of [1, 2, 3]) {
      expect(arrow(`Move rule ${position} up`)).toBeDisabled();
      expect(arrow(`Move rule ${position} down`)).toBeDisabled();
    }
    expect(requests("PUT")).toEqual([{ path: "/school-rules/order", body: { ruleIds: ["a", "c", "b"] } }]);

    await act(async () => {
      settle(answer([A, C, B]));
    });

    await waitFor(() => expect(arrow("Move rule 2 down")).toBeEnabled());
    expect(titles()).toEqual(["Rule A", "Rule C", "Rule B"]);
    expect(arrow("Move rule 1 up")).toBeDisabled();
    expect(arrow("Move rule 3 down")).toBeDisabled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("reorders up, sending the rule one place earlier", async () => {
    serve({ order: () => answer([B, A, C]) });
    const user = await open();

    await screen.findByText("Rule A");
    await user.press(arrow("Move rule 2 up"));

    await waitFor(() => expect(titles()).toEqual(["Rule B", "Rule A", "Rule C"]));
    expect(requests("PUT")).toEqual([{ path: "/school-rules/order", body: { ruleIds: ["b", "a", "c"] } }]);
  });

  it("reorders back to the list before the tap and toasts when the request fails", async () => {
    serve({ order: () => failure() });
    const user = await open();

    await screen.findByText("Rule A");
    await user.press(arrow("Move rule 2 down"));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("Something went wrong. Please try again."));
    expect(titles()).toEqual(["Rule A", "Rule B", "Rule C"]);
    expect(arrow("Move rule 2 down")).toBeEnabled();
  });

  it("reorders a stale list: reloads it and says the rules changed", async () => {
    const lists = [answer([A, B, C]), answer([A, B, C, rule("d", 4)], 4)];
    serve({ list: () => lists.shift(), order: () => failureWith(422, "schoolRule.order.mismatch") });
    const user = await open();

    await screen.findByText("Rule A");
    await user.press(arrow("Move rule 2 down"));

    await waitFor(() => expect(mockShow).toHaveBeenCalledWith("The rules changed. Check the new order."));
    await waitFor(() => expect(titles()).toEqual(["Rule A", "Rule B", "Rule C", "Rule D"]));
  });
});
