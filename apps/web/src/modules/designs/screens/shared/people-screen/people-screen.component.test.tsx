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

  it("IN-06-01: the same directory on the instructor's tab bar, with Pessoas selected", () => {
    render(<PeopleScreen locale="pt-br" state="list" role="instructor" />);

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.getByRole("tab", { name: "Pessoas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Escola" })).toBeNull();
    expect(screen.getByText("Rafael Rocha")).toBeInTheDocument();
  });

  describe("as an admin", () => {
    it("AD-09-01: the directory with the admin among the people, on the admin tab bar", () => {
      render(<PeopleScreen locale="pt-br" state="list" role="admin" />);

      expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
      expect(screen.getByText("10 na plataforma")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Juliana Prado" })).toBeInTheDocument();
      expect(screen.getAllByRole("tab").map((tab) => tab.getAttribute("aria-label"))).toEqual(["Início", "Aulas", "Pessoas", "Perfil"]);
      expect(screen.getByRole("tab", { name: "Pessoas" })).toHaveAttribute("aria-selected", "true");
    });

    it("AD-09-02..04: a student's, an instructor's and another admin's sheet, with their role actions", () => {
      const student = render(<PeopleScreen locale="pt-br" state="list" role="admin" adminSheet="student" />);
      expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
      expect(screen.getByRole("dialog")).toHaveTextContent("Caio Sousa");
      expect(screen.getByRole("button", { name: "Promover a instrutor" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Promover a admin" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remover da plataforma" })).toBeInTheDocument();
      student.unmount();

      const instructor = render(<PeopleScreen locale="pt-br" state="list" role="admin" adminSheet="instructor" />);
      expect(screen.getByRole("dialog")).toHaveTextContent("Marcos Lima");
      expect(screen.getByRole("button", { name: "Rebaixar a aluno" })).toBeInTheDocument();
      instructor.unmount();

      render(<PeopleScreen locale="pt-br" state="list" role="admin" adminSheet="admin" />);
      expect(screen.getByRole("dialog")).toHaveTextContent("Bruno Costa");
      expect(screen.getByRole("checkbox", { name: "Também é instrutor" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Passar a instrutor" })).toBeInTheDocument();
    });

    it("AD-09-05..06: the role change's and the removal's confirmations", () => {
      const role = render(<PeopleScreen locale="pt-br" state="list" role="admin" adminSheet="roleConfirm" />);
      expect(screen.getByRole("heading", { name: "Promover Caio a admin?" })).toBeInTheDocument();
      role.unmount();

      render(<PeopleScreen locale="pt-br" state="list" role="admin" adminSheet="removeConfirm" />);
      expect(screen.getByRole("heading", { name: "Remover Caio?" })).toBeInTheDocument();
    });
  });
});
