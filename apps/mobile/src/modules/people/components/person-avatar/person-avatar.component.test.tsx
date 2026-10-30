import { fireEvent, render, screen } from "@testing-library/react-native";

import { PersonAvatar } from "./person-avatar.component";

const PHOTO = "https://img.test/joao.jpg";

const failToLoad = () =>
  fireEvent(screen.getByTestId("person-avatar-photo"), "error", {
    nativeEvent: { error: "404" },
  });

describe("PersonAvatar", () => {
  it("shows the initials of the name", async () => {
    await render(<PersonAvatar name="João Pinto" photoUrl={null} />);

    expect(screen.getByText("JP")).toBeOnTheScreen();
    expect(screen.queryByTestId("person-avatar-photo")).toBeNull();
  });

  it("renders the large size", async () => {
    await render(<PersonAvatar name="Ana" photoUrl={null} size="lg" />);

    expect(screen.getByText("A")).toBeOnTheScreen();
  });

  it("shows the photo in place of the initials", async () => {
    await render(<PersonAvatar name="João Pinto" photoUrl={PHOTO} />);

    expect(screen.getByTestId("person-avatar-photo")).toBeOnTheScreen();
    expect(screen.queryByText("JP")).toBeNull();
  });

  it("shows the initials when the photo fails to load", async () => {
    await render(<PersonAvatar name="João Pinto" photoUrl={PHOTO} />);

    await failToLoad();

    expect(screen.getByText("JP")).toBeOnTheScreen();
    expect(screen.queryByTestId("person-avatar-photo")).toBeNull();
  });

  it("tries the next person's photo when a list reuses the row", async () => {
    await render(<PersonAvatar name="João Pinto" photoUrl={PHOTO} />);
    await failToLoad();

    await screen.rerender(
      <PersonAvatar name="Ana Souza" photoUrl="https://img.test/ana.jpg" />,
    );

    expect(screen.getByTestId("person-avatar-photo")).toBeOnTheScreen();
  });
});
