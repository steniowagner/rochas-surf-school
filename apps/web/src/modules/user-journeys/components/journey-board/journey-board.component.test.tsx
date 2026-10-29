import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { en as dictionary } from "@/i18n/dictionaries/en";

import { en } from "../../i18n/en";
import { buildJourneyGroups } from "../../utils/journey-groups";
import { JourneyBoard } from "./journey-board.component";

const KEY = "rochas-surf-school:user-journeys:student";
const groups = buildJourneyGroups("student", en);

const renderBoard = () =>
  render(
    <JourneyBoard
      flow="student"
      locale="en"
      groups={groups}
      labels={dictionary.userJourneys.labels}
      siteName={dictionary.site.name}
      heading={dictionary.userJourneys.title}
      flowTitle={en.flows.student.title}
    />,
  );

const counter = () => screen.getByTestId("journey-counter").textContent;
const box = (name: string) => screen.getByRole("checkbox", { name }) as HTMLInputElement;
const notes = (rowId: string) => screen.getByRole("textbox", { name: `Notes — ${rowId}` }) as HTMLTextAreaElement;

const mockClipboard = (writeText: (text: string) => Promise<void>) => {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: spy }, configurable: true });
  return spy;
};

describe("JourneyBoard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("shows every group and row, with nothing checked at first", () => {
    renderBoard();

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(
      groups.map((group) => group.title),
    );
    expect(screen.getAllByRole("checkbox")).toHaveLength(28 * 2);
    expect(screen.getAllByRole("checkbox").every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
    expect(counter()).toBe("0 approved · 0 denied · 28 not tested");
  });

  it("links each design frame in a new tab, and shows — without one", () => {
    renderBoard();

    const link = screen.getAllByRole("link", { name: "ST-01-02" })[0];
    expect(link).toHaveAttribute("href", "/en/designs/student-app#ST-01-02");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener");
  });

  it("shows — for a row without a design", () => {
    render(
      <JourneyBoard
        flow="auth"
        locale="en"
        groups={buildJourneyGroups("auth", en)}
        labels={dictionary.userJourneys.labels}
        siteName={dictionary.site.name}
        heading={dictionary.userJourneys.title}
        flowTitle={en.flows.auth.title}
      />,
    );

    const row = screen.getByText("AU-15", { selector: "th" }).closest("tr")!;
    expect(within(row).queryAllByRole("link")).toHaveLength(0);
    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("approved and denied exclude each other", async () => {
    renderBoard();

    await userEvent.click(box("Approved — ST-05"));
    expect(box("Approved — ST-05").checked).toBe(true);
    expect(counter()).toBe("1 approved · 0 denied · 27 not tested");

    await userEvent.click(box("Denied — ST-05"));
    expect(box("Approved — ST-05").checked).toBe(false);
    expect(box("Denied — ST-05").checked).toBe(true);
    expect(counter()).toBe("0 approved · 1 denied · 27 not tested");

    await userEvent.click(box("Denied — ST-05"));
    expect(box("Denied — ST-05").checked).toBe(false);
    expect(box("Approved — ST-05").checked).toBe(false);
    expect(counter()).toBe("0 approved · 0 denied · 28 not tested");
    expect(box("Approved — ST-04").checked).toBe(false);
    expect(box("Approved — ST-06").checked).toBe(false);
  });

  it("every row has notes", async () => {
    renderBoard();

    expect(screen.getAllByRole("textbox", { name: /^Notes — / })).toHaveLength(28);
    await userEvent.type(notes("ST-05"), "Map opens slowly");
    await userEvent.click(box("Approved — ST-05"));
    await userEvent.click(box("Denied — ST-05"));
    await userEvent.click(box("Denied — ST-05"));

    expect(notes("ST-05").value).toBe("Map opens slowly");
    expect(notes("ST-04").value).toBe("");
    expect(notes("ST-06").value).toBe("");
  });

  it("saves the name, results and notes on every change", async () => {
    renderBoard();

    await userEvent.type(screen.getByRole("textbox", { name: "Your name" }), "Ana");
    await userEvent.click(box("Approved — ST-01"));
    await userEvent.type(notes("ST-02"), "x");

    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      version: 1,
      name: "Ana",
      results: { "ST-01": "approved" },
      notes: { "ST-02": "x" },
    });
  });

  it("restores the progress saved in this browser", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ version: 1, name: "Ana", results: { "ST-01": "approved", "XX-01": "denied" }, notes: { "ST-02": "Slow" } }),
    );

    renderBoard();

    expect((screen.getByRole("textbox", { name: "Your name" }) as HTMLInputElement).value).toBe("Ana");
    expect(box("Approved — ST-01").checked).toBe(true);
    expect(notes("ST-02").value).toBe("Slow");
    expect(counter()).toBe("1 approved · 0 denied · 27 not tested");
  });

  it("opens with a broken saved value ignored", () => {
    localStorage.setItem(KEY, "{oops");

    renderBoard();

    expect(counter()).toBe("0 approved · 0 denied · 28 not tested");
  });

  it("keeps working in memory when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderBoard();

    await userEvent.click(box("Denied — ST-03"));
    await userEvent.type(notes("ST-03"), "Filter resets");

    expect(box("Denied — ST-03").checked).toBe(true);
    expect(notes("ST-03").value).toBe("Filter resets");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  describe("copy results", () => {
    it("copies the summary and reads Copied for 2 seconds", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(2026, 9, 29, 10, 0));
      const writeText = mockClipboard(() => Promise.resolve());
      localStorage.setItem(
        KEY,
        JSON.stringify({
          version: 1,
          name: "Ana",
          results: { "ST-01": "approved", "ST-02": "denied" },
          notes: { "ST-01": "Slow to load", "ST-02": "Arrows skip a week" },
        }),
      );
      renderBoard();

      fireEvent.click(screen.getByRole("button", { name: "Copy results" }));

      expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
      const text = writeText.mock.calls[0][0];
      expect(text.split("\n").slice(0, 7)).toEqual([
        "Rocha's Surf School — User journeys: Student app",
        "Tester: Ana",
        "Date: 2026-10-29",
        "1 approved · 1 denied · 26 not tested",
        "",
        "ST-01 — The schedule opens on this week: Approved — Slow to load",
        "ST-02 — Switch between week and month: Denied — Arrows skip a week",
      ]);
      expect(text.split("\n").at(-1)).toBe("ST-28 — Read your notifications: Not tested");

      // Let the "Copied" render's effect start its timer, then let 2 seconds pass.
      await act(async () => {});
      expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.getByRole("button", { name: "Copy results" })).toBeInTheDocument();
    });

    it("says the results couldn't be copied when the clipboard refuses", async () => {
      mockClipboard(() => Promise.reject(new Error("denied")));
      renderBoard();

      fireEvent.click(screen.getByRole("button", { name: "Copy results" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't copy the results. Try again.");
      expect(screen.getByRole("button", { name: "Copy results" })).toBeInTheDocument();
    });
  });

  describe("clear results", () => {
    const fill = async () => {
      await userEvent.type(screen.getByRole("textbox", { name: "Your name" }), "Ana");
      await userEvent.click(box("Approved — ST-01"));
      await userEvent.type(notes("ST-02"), "Slow");
    };

    it("resets the name, results and notes and forgets the flow when confirmed", async () => {
      localStorage.setItem("rochas-surf-school:user-journeys:admin", JSON.stringify({ version: 1, name: "Bia", results: {}, notes: {} }));
      const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
      renderBoard();
      await fill();

      await userEvent.click(screen.getByRole("button", { name: "Clear results" }));

      expect(confirm).toHaveBeenCalledWith("Clear every result and note of this flow?");
      expect((screen.getByRole("textbox", { name: "Your name" }) as HTMLInputElement).value).toBe("");
      expect(box("Approved — ST-01").checked).toBe(false);
      expect(notes("ST-02").value).toBe("");
      expect(counter()).toBe("0 approved · 0 denied · 28 not tested");
      expect(localStorage.getItem(KEY)).toBeNull();
      expect(localStorage.getItem("rochas-surf-school:user-journeys:admin")).not.toBeNull();
    });

    it("changes nothing when cancelled", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      renderBoard();
      await fill();

      await userEvent.click(screen.getByRole("button", { name: "Clear results" }));

      expect((screen.getByRole("textbox", { name: "Your name" }) as HTMLInputElement).value).toBe("Ana");
      expect(box("Approved — ST-01").checked).toBe(true);
      expect(notes("ST-02").value).toBe("Slow");
      expect(JSON.parse(localStorage.getItem(KEY)!).name).toBe("Ana");
    });
  });

  it("labels each card field for the phone layout", () => {
    renderBoard();

    const row = screen.getByText("ST-05", { selector: "th" }).closest("tr")!;
    for (const label of ["Before you start", "Steps", "Expected behavior", "Design", "Result", "Notes"]) {
      expect(within(row).getByText(label)).toBeInTheDocument();
    }
  });
});
