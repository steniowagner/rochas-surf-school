import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { en as dictionary } from "@/i18n/dictionaries/en";

import { CopyEmailButton } from "./copy-email-button.component";

const ADMIN = "teste01.admin@rochas-surf-school.test";
const STUDENT = "teste05.aluno@rochas-surf-school.test";
const labels = dictionary.userJourneys.testAccounts;

const mockClipboard = (writeText: (text: string) => Promise<void>) => {
  const spy = vi.fn(writeText);
  Object.defineProperty(navigator, "clipboard", { value: { writeText: spy }, configurable: true });
  return spy;
};

describe("CopyEmailButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("names the button after its email and keeps it at least 44 px tall", () => {
    render(<CopyEmailButton email={ADMIN} labels={labels} />);

    const button = screen.getByRole("button", { name: `Copy email ${ADMIN}` });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("min-h-11");
  });

  it("copies the email and reads Copied for 2 seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const writeText = mockClipboard(() => Promise.resolve());
    render(<CopyEmailButton email={STUDENT} labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: `Copy email ${STUDENT}` }));

    expect(await screen.findByRole("button", { name: `Copied ${STUDENT}` })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(STUDENT);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Let the "Copied" render's effect start its timer, then let 2 seconds pass.
    await act(async () => {});
    expect(screen.getByRole("button", { name: `Copied ${STUDENT}` })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: `Copy email ${STUDENT}` })).toBeInTheDocument();
  });

  it("says the email couldn't be copied until the next tap", async () => {
    const writeText = mockClipboard(() => Promise.reject(new Error("denied")));
    render(<CopyEmailButton email={ADMIN} labels={labels} />);

    fireEvent.click(screen.getByRole("button", { name: `Copy email ${ADMIN}` }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't copy the email. Try again.");
    expect(screen.getByRole("button", { name: `Copy email ${ADMIN}` })).toBeInTheDocument();

    writeText.mockImplementation(() => Promise.resolve());
    fireEvent.click(screen.getByRole("button", { name: `Copy email ${ADMIN}` }));

    expect(await screen.findByRole("button", { name: `Copied ${ADMIN}` })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("changes only the button that was tapped", async () => {
    mockClipboard(() => Promise.resolve());
    render(
      <>
        <CopyEmailButton email={ADMIN} labels={labels} />
        <CopyEmailButton email={STUDENT} labels={labels} />
      </>,
    );

    fireEvent.click(screen.getByRole("button", { name: `Copy email ${STUDENT}` }));

    expect(await screen.findByRole("button", { name: `Copied ${STUDENT}` })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Copy email ${ADMIN}` })).toBeInTheDocument();
  });
});
