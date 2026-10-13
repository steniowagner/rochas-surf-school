import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "./theme-toggle.component";

const mockColorScheme = (dark: boolean) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: dark }),
  );
};

describe("ThemeToggle", () => {
  beforeEach(() => {
    delete document.documentElement.dataset.theme;
    localStorage.clear();
    mockColorScheme(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is a button named by its label", () => {
    render(<ThemeToggle label="Switch theme" />);

    expect(screen.getByRole("button", { name: "Switch theme" })).toBeInTheDocument();
  });

  it("flips from the OS light scheme to dark and stores it", async () => {
    render(<ThemeToggle label="Switch theme" />);

    await userEvent.click(screen.getByRole("button"));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("flips from the OS dark scheme to light", async () => {
    mockColorScheme(true);
    render(<ThemeToggle label="Switch theme" />);

    await userEvent.click(screen.getByRole("button"));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("flips from the theme already set on <html>", async () => {
    document.documentElement.dataset.theme = "dark";
    render(<ThemeToggle label="Switch theme" />);

    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("light");

    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("still flips when storage throws", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    render(<ThemeToggle label="Switch theme" />);

    await userEvent.click(screen.getByRole("button"));

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
