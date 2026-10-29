import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageSheet } from "./language-sheet.component";

describe("LanguageSheet", () => {
  it("lists the languages with the selected one checked in lagoon", () => {
    render(
      <LanguageSheet
        title="Idioma"
        description="Escolha o idioma do app."
        locales={[
          { flag: "🇺🇸", name: "English", selected: false },
          { flag: "🇧🇷", name: "Português", selected: true },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Idioma" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Português/ }).querySelector("svg")).toHaveClass("text-lagoon");
    expect(screen.getByRole("button", { name: /English/ }).querySelector("svg")).toBeNull();
  });
});
