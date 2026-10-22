import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { ErrorState } from "./error-state.component";

const getSpinners = () =>
  screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

describe("ErrorState", () => {
  it("renders the title as a header and the description", async () => {
    await render(
      <ErrorState
        title="Something went wrong"
        description="We couldn't load this page."
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByRole("header", { name: "Something went wrong" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("We couldn't load this page.")).toBeOnTheScreen();
  });

  it("calls onRetry from the Try again button", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(
      <ErrorState title="Title" description="Text" onRetry={onRetry} />,
    );

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the spinner and ignores presses while retrying", async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(
      <ErrorState
        title="Title"
        description="Text"
        onRetry={onRetry}
        retrying
      />,
    );

    await user.press(screen.getByRole("button", { name: "Try again" }));

    expect(getSpinners()).toHaveLength(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it.each([
    ["pt-BR", "Tentar de novo"],
    ["es-ES", "Intentar de nuevo"],
  ])("labels the button in %s", async (locale, label) => {
    await i18n.changeLanguage(locale);
    await render(
      <ErrorState title="Title" description="Text" onRetry={() => {}} />,
    );

    expect(screen.getByRole("button", { name: label })).toBeOnTheScreen();
  });
});
