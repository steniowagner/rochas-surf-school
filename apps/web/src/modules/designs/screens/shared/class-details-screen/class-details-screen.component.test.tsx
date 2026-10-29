import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassDetailsScreen } from "./class-details-screen.component";
import type { AdminClassDetailsSheet, AdminClassDetailsState, ClassDetailsScreenProps, ClassDetailsToast, InstructorClassDetailsSheet, InstructorClassDetailsState } from "./class-details-screen.types";

const texts = { denialReason: "Turma reservada.", takeOutReason: "Aula reorganizada.", notes: "Traga protetor solar." };
const open = (props: Omit<Extract<ClassDetailsScreenProps, { role?: "student" }>, "locale" | "texts">) => render(<ClassDetailsScreen locale="pt-br" texts={texts} {...props} />);
const footerButton = (name: string) => screen.getByRole("button", { name });

describe("ClassDetailsScreen", () => {
  it("ST-02-01: an open class, not enrolled, with the request button", () => {
    open({ state: "open" });

    expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
    expect(screen.queryByTestId("enrolment-banner")).toBeNull();
    expect(footerButton("Pedir para entrar")).toHaveClass("bg-sun");
    expect(screen.getByText("Quarta-feira · 9 set")).toBeInTheDocument();
    expect(screen.getByText("Até ter, 8 set · 20:00")).toBeInTheDocument();
    expect(screen.getByText("3 regras para todos os alunos")).toBeInTheDocument();
    expect(screen.getByText("Traga protetor solar.")).toBeInTheDocument();
    expect(screen.getByText("Onde e como")).toBeInTheDocument();
  });

  it.each([
    ["request", "Pedir para entrar"],
    ["requestSending", "Você pode cancelar até ter, 8 set · 20:00."],
    ["requestNoDeadline", "Prazo ainda não definido"],
    ["requestNoRule", "A escola ainda não escreveu esta regra."],
    ["requestWaitingList", "Entrar na lista de espera"],
  ] as const)("ST-02-02..04, 09: the request sheet (%s)", (sheet, text) => {
    open({ state: sheet === "requestWaitingList" ? "fullWaitingList" : "open", sheet });

    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("ST-02-05, 30: toasts over the top", () => {
    const { unmount } = open({ state: "pending", toast: { key: "enrolment.requestSheet.done", tone: "success" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Pedido enviado");
    unmount();

    open({ state: "open", toast: { key: "enrolment.errors.ruleNotAccepted", tone: "error" } });
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    expect(screen.getByRole("alert")).toHaveTextContent("A regra de cancelamento mudou");
  });

  it("ST-02-06, 07: pending with the withdraw button and sheet", () => {
    open({ state: "pending", sheet: "withdraw" });
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");

    expect(screen.getByText("Pedido pendente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular pedido" })).toHaveClass("border-input-line");
    expect(screen.getByRole("heading", { name: "Anular pedido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sim, anular" })).toBeInTheDocument();
  });

  it("ST-02-08, 10, 11: a full class and its waiting list", () => {
    const { unmount } = open({ state: "fullWaitingList" });
    expect(screen.getByText("Turma cheia")).toBeInTheDocument();
    expect(screen.getByText("Você pode entrar na lista de espera.")).toBeInTheDocument();
    expect(footerButton("Entrar na lista de espera")).toBeInTheDocument();
    unmount();

    const waiting = open({ state: "waitingList" });
    expect(screen.getByText("Você está na lista de espera")).toBeInTheDocument();
    expect(footerButton("Sair da lista de espera")).toHaveClass("text-ink");
    expect(screen.queryByText("Turma cheia")).toBeNull();
    waiting.unmount();

    open({ state: "fullClosed" });
    expect(screen.getByText("A lista de espera está fechada para esta aula.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pedir|lista de espera/ })).toBeNull();
  });

  it("ST-02-12, 13: approved with the cancel button and sheet", () => {
    open({ state: "approved", sheet: "cancelSeat" });

    expect(screen.getByText("Você está inscrito")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar inscrição" })).toBeInTheDocument();
    expect(screen.getByText("Sua vaga fica livre. Você pode cancelar até ter, 8 set · 20:00.")).toBeInTheDocument();
  });

  it("ST-02-14, 20: the student cancelled", () => {
    open({ state: "cancelled", toast: { key: "enrolment.cancelSeatSheet.done", tone: "success" } });

    expect(screen.getByText("Você cancelou a inscrição")).toBeInTheDocument();
    expect(footerButton("Pedir novamente")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Inscrição cancelada");
  });

  it("ST-02-15, 16: no cancel button when the deadline passed or is missing, but a note and the school's contact", () => {
    const { unmount } = open({ state: "approvedPassed" });
    expect(screen.getByText("O prazo para cancelar terminou em seg, 7 set · 08:00. Fale com a escola.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Falar com a escola" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar inscrição" })).toBeNull();
    unmount();

    open({ state: "approvedNoDeadline" });
    expect(screen.getByText(/ainda não foi definido/)).toBeInTheDocument();
    expect(screen.getByText("Ler a regra")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Falar com a escola" })).toBeInTheDocument();
  });

  it("ST-02-17, 18: denied, with the pressable banner and the reason sheet", () => {
    const { unmount } = open({ state: "denied", sheet: "denial" });
    expect(screen.getByTestId("enrolment-banner")).toHaveAttribute("role", "button");
    expect(footerButton("Pedir novamente")).toBeInTheDocument();
    expect(screen.getByText("Turma reservada.")).toBeInTheDocument();
    unmount();

    open({ state: "denied", sheet: "denial", withoutReason: true });
    expect(screen.getByText("Sem motivo indicado.")).toBeInTheDocument();
  });

  it.each([
    ["withdrawn", "Pedido anulado"],
    ["expired", "Você não conseguiu vaga"],
    ["takenOut", "Você foi retirado da aula"],
  ] as const)("ST-02-19, 21, 22: %s can ask again", (state, title) => {
    open({ state });

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(footerButton("Pedir novamente")).toBeInTheDocument();
  });

  it("ST-02-22: the taken-out banner shows the school's reason", () => {
    open({ state: "takenOut" });

    expect(screen.getByText("Motivo: “Aula reorganizada.”")).toBeInTheDocument();
  });

  it("ST-02-23..25: started, finished and cancelled classes have no footer", () => {
    const started = open({ state: "started" });
    expect(screen.getByText("Começou às 08:00 e termina às 09:30.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pedir|Anular|Cancelar/ })).toBeNull();
    started.unmount();

    const finished = open({ state: "finished" });
    expect(screen.getByText("Aula finalizada")).toBeInTheDocument();
    expect(screen.getByText("5 alunos presentes")).toBeInTheDocument();
    expect(screen.queryByText(/Máx\./)).toBeNull();
    finished.unmount();

    open({ state: "classCancelled" });
    expect(screen.getByText("Aula cancelada")).toBeInTheDocument();
    expect(screen.queryByText("Regras")).toBeNull();
  });

  it("ST-02-26: a class without an instructor", () => {
    open({ state: "noInstructor" });

    expect(screen.getByText("Sem instrutor atribuído")).toBeInTheDocument();
  });

  it("ST-02-27..29: loading, not found and error fill a phone-height frame", () => {
    const loading = open({ state: "loading" });
    expect(screen.getByTestId("class-details-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
    loading.unmount();

    const missing = open({ state: "notFound" });
    expect(screen.getByRole("heading", { name: "Aula não encontrada" })).toBeInTheDocument();
    missing.unmount();

    open({ state: "error" });
    expect(screen.getByRole("heading", { name: "Algo deu errado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
  });

  describe("the instructor's form", () => {
    const rules = { surf: "Cancele até 12 horas antes.", skate: "Cancele até 24 horas antes." };
    const openAs = (state: InstructorClassDetailsState, sheet?: InstructorClassDetailsSheet) =>
      render(<ClassDetailsScreen locale="pt-br" role="instructor" state={state} sheet={sheet} texts={{ ...texts, cancellationRules: rules }} />);

    it("IN-03-01: a class Rafael teaches, read-only, with him as Você and the student rows open; no enrolment, footer or tools", () => {
      openAs("teaches");

      expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
      expect(screen.getByText("Matrículas, cancelamentos e mudanças de horário são feitos pela escola")).toBeInTheDocument();
      expect(screen.getByText("Você")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Ana Beatriz Lima" })).toBeInTheDocument();
      expect(screen.getByText("Máx. 8 alunos · 4 vagas livres")).toBeInTheDocument();
      expect(screen.queryByTestId("enrolment-banner")).toBeNull();
      expect(screen.queryByRole("button", { name: /Pedir|Cancelar|Ferramentas/ })).toBeNull();
      expect(screen.getByText("Até ter, 8 set · 20:00")).toBeInTheDocument();
    });

    it("IN-03-02..03: another instructor's class, and one nobody teaches, with the not-assigned note", () => {
      const other = openAs("notAssigned");
      expect(screen.getByText("Marina Teixeira")).toBeInTheDocument();
      expect(screen.getByText("Você não está escalado nesta aula — você vê tudo em modo somente leitura")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Ana Beatriz Lima" })).toBeNull();
      other.unmount();

      openAs("noInstructor");
      expect(screen.getByText("Sem instrutor atribuído")).toBeInTheDocument();
      expect(screen.getByText(/Você não está escalado/)).toBeInTheDocument();
    });

    it("IN-03-04: the full banner with its title only, and the sold-out line", () => {
      openAs("full");

      expect(screen.getByText("Turma cheia")).toBeInTheDocument();
      expect(screen.queryByText(/lista de espera/i)).toBeNull();
      expect(screen.getByText("Máx. 8 alunos · esgotado")).toHaveClass("text-bad");
    });

    it("IN-03-05..06: the trial guests' rows, and a class with every seat free", () => {
      const guests = openAs("guests");
      expect(screen.getByText("Lucas Martins")).toBeInTheDocument();
      expect(screen.getByText("Beatriz Nunes")).toBeInTheDocument();
      expect(screen.getAllByText("Trial")).toHaveLength(2);
      expect(screen.getByText("Máx. 8 alunos · 2 vagas livres")).toBeInTheDocument();
      guests.unmount();

      openAs("noStudents");
      expect(screen.getByText("Máx. 8 alunos · 8 vagas livres")).toBeInTheDocument();
      expect(screen.getByText("Ainda sem alunos")).toBeInTheDocument();
    });

    it("IN-03-07..09: started, finished, and cancelled without the rules card", () => {
      const started = openAs("started");
      expect(screen.getByText("Começou às 08:00 e termina às 09:30.")).toBeInTheDocument();
      started.unmount();

      const finished = openAs("finished");
      expect(screen.getByText("Aula finalizada")).toBeInTheDocument();
      finished.unmount();

      openAs("classCancelled");
      expect(screen.getByText("Aula cancelada")).toBeInTheDocument();
      expect(screen.queryByText("Regras")).toBeNull();
    });

    it("IN-03-10..11: a student's person sheet and the cancellation rules sheet, over a phone-height frame", () => {
      const person = openAs("teaches", "person");
      expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
      expect(screen.getByRole("dialog")).toHaveTextContent("Caio Sousa");
      expect(screen.getByRole("button", { name: "Conversar por WhatsApp" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
      person.unmount();

      openAs("teaches", "rules");
      expect(screen.getByRole("dialog")).toHaveTextContent("Cancele até 12 horas antes.");
    });

    it("IN-03-12..14: loading, not found and error", () => {
      const loading = openAs("loading");
      expect(screen.getByRole("status", { name: "Carregando a aula" })).toBeInTheDocument();
      loading.unmount();

      const notFound = openAs("notFound");
      expect(screen.getByRole("heading", { name: "Aula não encontrada" })).toBeInTheDocument();
      notFound.unmount();

      openAs("error");
      expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    });
  });

  describe("as an admin", () => {
    const asAdmin = (state: AdminClassDetailsState, sheet?: AdminClassDetailsSheet, toast?: ClassDetailsToast) =>
      render(<ClassDetailsScreen locale="pt-br" role="admin" state={state} sheet={sheet} toast={toast} texts={texts} />);
    const tools = () => screen.queryByRole("button", { name: "Ferramentas da aula" });

    it("AD-03-01: the tools button, the people with their take-out buttons and the trial count, no enrolment or footer", () => {
      asAdmin("open");

      expect(screen.getByTestId("phone-frame")).toHaveAttribute("data-tall");
      expect(tools()).toBeInTheDocument();
      expect(screen.getByText("Máx. 8 alunos · 2 vagas livres · inclui 2 trial")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retirar Caio Sousa" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retirar Lucas Martins" })).toBeInTheDocument();
      expect(screen.getAllByText("Trial")).toHaveLength(2);
      expect(screen.getByText("Rafael Rocha")).toBeInTheDocument();
      expect(screen.queryByTestId("enrolment-banner")).toBeNull();
      expect(screen.queryByRole("button", { name: /Pedir para entrar|Cancelar inscrição/ })).toBeNull();
      expect(screen.queryByText(/somente leitura|feitos pela escola/)).toBeNull();
      expect(screen.queryByText("Sem instrutor")).toBeNull();
      expect(screen.getByText("Traga protetor solar.")).toBeInTheDocument();
    });

    it("AD-03-02..03: the no-instructor banner, and the no-deadline banner with the sport and the rule to read", () => {
      const noInstructor = asAdmin("noInstructor");
      expect(screen.getByText("Sem instrutor")).toBeInTheDocument();
      expect(screen.getByText("Atribua um instrutor antes da aula.")).toBeInTheDocument();
      expect(screen.getByText("Sem instrutor atribuído")).toBeInTheDocument();
      noInstructor.unmount();

      asAdmin("noDeadline");
      expect(screen.getByText("Sem prazo de cancelamento")).toBeInTheDocument();
      expect(screen.getByText(/Confira a regra de surf\./)).toBeInTheDocument();
      expect(screen.getByText("Ler a regra")).toBeInTheDocument();
    });

    it("AD-03-04..05: the full banner with the admin's line, and a class nobody joined yet", () => {
      const full = asAdmin("full");
      expect(screen.getByText("Turma cheia")).toBeInTheDocument();
      expect(screen.getByText("Novos pedidos entram na lista de espera.")).toBeInTheDocument();
      expect(screen.queryByText("Você pode entrar na lista de espera.")).toBeNull();
      full.unmount();

      asAdmin("noStudents");
      expect(screen.getByText("Máx. 8 alunos · 8 vagas livres")).toBeInTheDocument();
      expect(screen.getByText("Ainda sem alunos")).toBeInTheDocument();
      expect(tools()).toBeInTheDocument();
    });

    it("AD-03-06..08: a started class keeps the tools but no take-out; a finished or cancelled one has no tools", () => {
      const started = asAdmin("started");
      expect(screen.getByText("Começou às 08:00 e termina às 09:30.")).toBeInTheDocument();
      expect(tools()).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Retirar/ })).toBeNull();
      expect(screen.getByRole("button", { name: "Ana Beatriz Lima" })).toBeInTheDocument();
      started.unmount();

      const finished = asAdmin("finished");
      expect(screen.getByText("Aula finalizada")).toBeInTheDocument();
      expect(tools()).toBeNull();
      // The list of a class that already happened stays closed.
      expect(screen.queryByRole("button", { name: "Ana Beatriz Lima" })).toBeNull();
      finished.unmount();

      asAdmin("classCancelled");
      expect(screen.getByText("Aula cancelada")).toBeInTheDocument();
      expect(tools()).toBeNull();
    });

    it("AD-03-09..10: the tools sheet of a class with people, and of an empty one", () => {
      const enrolled = asAdmin("open", "tools");
      expect(screen.getByTestId("phone-frame")).not.toHaveAttribute("data-tall");
      expect(screen.getByText("6 pessoas")).toBeInTheDocument();
      expect(screen.getByText("Avisa 6 pessoas")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Excluir aula" })).toBeDisabled();
      expect(screen.getByText("Tem inscritos")).toBeInTheDocument();
      enrolled.unmount();

      asAdmin("noStudents", "tools");
      expect(screen.getByRole("button", { name: "Excluir aula" })).toBeEnabled();
      expect(screen.getByText("Ninguém inscrito")).toBeInTheDocument();
    });

    it("AD-03-11..13: the cancel sheet with its audience and the guests warning, and the delete sheet in both forms", () => {
      const cancel = asAdmin("open", "cancel");
      expect(screen.getByText("Avisamos 4 inscritos, 1 pessoa com pedido pendente e 1 instrutor. A aula fica na agenda, marcada como cancelada.")).toBeInTheDocument();
      expect(screen.getByTestId("guests-warning")).toBeInTheDocument();
      cancel.unmount();

      const remove = asAdmin("noStudents", "delete");
      expect(screen.getByRole("heading", { name: "Excluir esta aula?" })).toBeInTheDocument();
      expect(screen.getByText("Surf Iniciante · Quarta-feira · 9 set, 08:00 – 09:30 · Praia de Iracema")).toBeInTheDocument();
      remove.unmount();

      asAdmin("noStudents", "deleteNotEmpty");
      expect(screen.getByRole("heading", { name: "Não dá para excluir" })).toBeInTheDocument();
    });

    it("AD-03-14..16: taking a student or a guest out, and a student's person sheet", () => {
      const student = asAdmin("open", "takeOut");
      expect(screen.getByRole("heading", { name: "Retirar Caio da aula?" })).toBeInTheDocument();
      expect(screen.getByText("Motivo (opcional)")).toBeInTheDocument();
      student.unmount();

      const guest = asAdmin("open", "takeOutGuest");
      expect(screen.getByRole("heading", { name: "Retirar Lucas Martins da aula?" })).toBeInTheDocument();
      expect(screen.queryByText("Motivo (opcional)")).toBeNull();
      guest.unmount();

      asAdmin("open", "person");
      expect(screen.getByRole("dialog")).toHaveTextContent("Caio Sousa");
    });

    it("AD-03-17: the class after the take-out, with the toast", () => {
      asAdmin("takenOut", undefined, { key: "takeOutSheet.done", tone: "success", params: { name: "Caio Sousa" } });

      expect(screen.getByTestId("screen-toast")).toHaveTextContent("Caio Sousa retirado · aluno avisado");
      expect(screen.queryByRole("button", { name: "Retirar Caio Sousa" })).toBeNull();
      expect(screen.getByText("Máx. 8 alunos · 3 vagas livres · inclui 2 trial")).toBeInTheDocument();
    });

    it("AD-03-18..20: loading, not found and error, without the tools", () => {
      const loading = asAdmin("loading");
      expect(screen.getByRole("status", { name: "Carregando a aula" })).toBeInTheDocument();
      expect(tools()).toBeNull();
      loading.unmount();

      const notFound = asAdmin("notFound");
      expect(screen.getByRole("heading", { name: "Aula não encontrada" })).toBeInTheDocument();
      notFound.unmount();

      asAdmin("error");
      expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeInTheDocument();
    });
  });
});
