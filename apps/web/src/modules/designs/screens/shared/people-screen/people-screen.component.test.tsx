import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PeopleScreen } from "./people-screen.component";

const open = (state: Parameters<typeof PeopleScreen>[0]["state"]) => render(<PeopleScreen locale="pt-br" state={state} />);

describe("PeopleScreen", () => {
  it("ST-04-01: the intro with the count, the search, the filters and the people by initial, in a tall frame", () => {
    open("list");

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByText("9 na plataforma")).toBeInTheDocument();
    expect(screen.getByText("Procurar pessoa")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 4 }).map((heading) => heading.textContent)).toEqual(["A", "B", "C", "D", "E", "M", "R"]);
    expect(screen.getByRole("button", { name: "Rafael Rocha" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Escola" })).toHaveAttribute("aria-selected", "true");
  });

  it("ST-04-02: a name typed and the instructors filter on show only the matching rows", () => {
    open("filtered");

    expect(screen.getByText("mar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Instrutores", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcos Lima" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marina Teixeira" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rafael Rocha" })).toBeNull();
  });

  it("ST-04-03..05: nobody found, loading and error", () => {
    const empty = open("empty");
    expect(screen.getByRole("heading", { name: "Ninguém encontrado" })).toBeInTheDocument();
    empty.unmount();

    const loading = open("loading");
    expect(screen.getByTestId("people-skeleton")).toBeInTheDocument();
    loading.unmount();

    open("error");
    expect(screen.getByText("Não foi possível carregar as pessoas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  it("ST-04-06..08: the person sheet of an instructor, with or without a shared number, and the toast", () => {
    const shared = open("sheet");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conversar por WhatsApp" })).toHaveTextContent("+55 85 99999 8888");
    shared.unmount();

    const hidden = open("sheetNotShared");
    expect(screen.getByText("Número não compartilhado.")).toBeInTheDocument();
    hidden.unmount();

    open("whatsappUnavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível abrir o WhatsApp.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
