import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SendNoticeScreen } from "./send-notice-screen.component";

const notice = { title: "Mudança de praia no sábado", message: "Sábado a aula é na Praia do Futuro, no mesmo horário." };

describe("SendNoticeScreen", () => {
  it("AD-05-01: the intro, everyone with how many they are, the empty fields and Send disabled", () => {
    render(<SendNoticeScreen locale="pt-br" state="empty" notice={notice} />);

    expect(screen.getByRole("heading", { name: "Enviar aviso" })).toBeInTheDocument();
    expect(screen.getByText("Quem recebe")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Todos" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("notice-recipients-count")).toHaveTextContent("48 pessoas vão receber");
    expect(screen.getByText("Ex.: Mudança de praia no sábado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("AD-05-02..03: the students, the notice typed, and the confirm sheet with its preview", () => {
    const filled = render(<SendNoticeScreen locale="pt-br" state="filled" notice={notice} />);
    expect(screen.getByRole("tab", { name: "Alunos" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("notice-recipients-count")).toHaveTextContent("42 pessoas vão receber");
    expect(screen.getByText(notice.title)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
    filled.unmount();

    render(<SendNoticeScreen locale="pt-br" state="confirm" notice={notice} />);
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "Enviar a 42 pessoas?" })).toBeInTheDocument();
    expect(within(sheet).getByText("Todos os alunos recebem uma notificação. Depois de enviado, não dá para apagar.")).toBeInTheDocument();
    expect(within(sheet).getByTestId("notice-preview")).toHaveTextContent(notice.message);
  });

  it("AD-05-05..06: the message to the class, with its card in the audience's place, and its confirmation", () => {
    const message = render(<SendNoticeScreen locale="pt-br" state="classMessage" notice={notice} />);
    expect(screen.getByRole("heading", { name: "Mensagem para a turma" })).toBeInTheDocument();
    expect(screen.getByTestId("class-message-card")).toHaveTextContent("6 pessoas recebem");
    expect(screen.getByText("1 instrutor · 4 alunos · 1 pedido pendente")).toBeInTheDocument();
    expect(screen.getByText("Quarta, 9 Set")).toBeInTheDocument();
    expect(screen.queryByText("Quem recebe")).toBeNull();
    expect(screen.queryByTestId("notice-recipients-count")).toBeNull();
    message.unmount();

    render(<SendNoticeScreen locale="pt-br" state="classConfirm" notice={notice} />);
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("heading", { name: "Enviar a 6 pessoas?" })).toBeInTheDocument();
    expect(within(sheet).getByText("Os instrutores e os alunos de Surf Iniciante · Quarta-feira · 9 set, 08:00 recebem uma notificação. Depois de enviada, não dá para apagar.")).toBeInTheDocument();
  });
});
