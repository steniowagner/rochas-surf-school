import { render, screen, userEvent } from "@testing-library/react-native";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../../cancellation-rules.test-utils";

import { CancellationRulesSheet } from "./cancellation-rules-sheet.component";

jest.useFakeTimers();

beforeEach(setupSignedInUser);

const renderSheet = async (visible = true, onClose = jest.fn()) => {
  const Wrapper = createWrapper(createQueryClient());
  await render(
    <Wrapper>
      <CancellationRulesSheet visible={visible} onClose={onClose} />
    </Wrapper>,
  );

  return userEvent.setup();
};

describe("CancellationRulesSheet", () => {
  it("shows the surf rule as written and the empty text for the missing skate rule (cancellation rules)", async () => {
    fetchMock.mockResolvedValue(ok({ surf: "O aluno pode cancelar até 12 horas antes.", skate: null }));

    await renderSheet();

    expect(await screen.findByText("O aluno pode cancelar até 12 horas antes.")).toBeOnTheScreen();
    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Skate")).toBeOnTheScreen();
    expect(screen.getByText("The school hasn't written this rule yet.")).toBeOnTheScreen();
    expect(screen.getByText("Cancellation rules")).toBeOnTheScreen();
  });

  it("shows a spinner while loading (cancellation rules)", async () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));

    await renderSheet();

    expect(screen.queryByText("Try again")).toBeNull();
    expect(screen.queryByText("The school hasn't written this rule yet.")).toBeNull();
  });

  it("shows the error and reloads with Try again (cancellation rules)", async () => {
    fetchMock.mockResolvedValueOnce(failure()).mockResolvedValueOnce(ok({ surf: "Surf.", skate: "Skate." }));
    const user = await renderSheet();

    expect(await screen.findByText("Couldn't load the rules.")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Surf.")).toBeOnTheScreen();
    expect(screen.getByText("Skate.")).toBeOnTheScreen();
  });

  it("does not load while closed (cancellation rules)", async () => {
    await renderSheet(false);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("closes with Close (cancellation rules)", async () => {
    fetchMock.mockResolvedValue(ok({ surf: null, skate: null }));
    const onClose = jest.fn();
    const user = await renderSheet(true, onClose);
    await screen.findAllByText("The school hasn't written this rule yet.");

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
