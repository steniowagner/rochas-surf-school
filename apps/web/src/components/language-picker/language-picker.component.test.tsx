import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguagePicker } from "./language-picker.component";

const mockPathname = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ usePathname: mockPathname }));

describe("LanguagePicker", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/pt-br/terms-of-use");
  });

  it("names the picker after the label and the current language", () => {
    render(<LanguagePicker locale="pt-br" label="Language" />);

    expect(screen.getByText("PT").closest("summary")).toHaveAttribute(
      "aria-label",
      "Language: Português",
    );
  });

  it("lists the three languages linking the current path under each locale", () => {
    render(<LanguagePicker locale="pt-br" label="Language" />);

    expect(screen.getAllByRole("link", { hidden: true })).toHaveLength(3);
    expect(screen.getByRole("link", { name: /Português/, hidden: true })).toHaveAttribute(
      "href",
      "/pt-br/terms-of-use",
    );
    expect(screen.getByRole("link", { name: /Español/, hidden: true })).toHaveAttribute(
      "href",
      "/es/terms-of-use",
    );
    expect(screen.getByRole("link", { name: /English/, hidden: true })).toHaveAttribute(
      "href",
      "/en/terms-of-use",
    );
  });

  it("marks only the current language as the current page", () => {
    mockPathname.mockReturnValue("/es");
    render(<LanguagePicker locale="es" label="Language" />);

    expect(screen.getByRole("link", { name: /Español/, hidden: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /English/, hidden: true })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByRole("link", { name: /English/, hidden: true })).toHaveAttribute("href", "/en");
  });

  it("links the home of each locale when the path is outside the current locale", () => {
    mockPathname.mockReturnValue("/");
    render(<LanguagePicker locale="en" label="Language" />);

    expect(screen.getByRole("link", { name: /Español/, hidden: true })).toHaveAttribute("href", "/es");
  });
});
