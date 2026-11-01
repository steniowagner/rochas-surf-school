import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { buildClassItem } from "@/modules/classes/classes.test-utils";

import {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../../notifications.test-utils";
import type { AdminMessage } from "../../notifications.types";

import { MessageSheet } from "./message-sheet.component";
import type { MessageSheetProps } from "./message-sheet.types";

// A sheet that is really gone when it isn't visible.
jest.mock("@/components/ui/bottom-modal", () => ({
  BottomModal: ({
    visible,
    onClose,
    children,
  }: {
    visible: boolean;
    onClose: () => void;
    children: ReactNode;
  }) => {
    const { Pressable, Text } = jest.requireActual("react-native");

    return visible ? (
      <>
        <Pressable accessibilityRole="button" accessibilityLabel="Drag down" onPress={onClose}>
          <Text>Drag down</Text>
        </Pressable>
        {children}
      </>
    ) : null;
  },
}));

const SENDER: NonNullable<AdminMessage["sender"]> = {
  id: "s-1",
  name: "Ana Souza",
  photoUrl: null,
  role: "admin",
  whatsappNumber: "+5585999998888",
};

const NOTICE: AdminMessage = {
  title: "Escola fechada no feriado",
  text: "Não há aulas na terça.",
  createdAt: "2026-10-20T12:00:00.000Z",
  classId: null,
  sender: SENDER,
};

const CLASS_MESSAGE: AdminMessage = { ...NOTICE, classId: "c-1" };
const CLASS = buildClassItem("c-1", "2026-10-21T12:00:00.000Z", "2026-10-21T13:00:00.000Z");

const renderSheet = (props: Partial<MessageSheetProps> = {}) =>
  render(<MessageSheet message={NOTICE} visible onClose={jest.fn()} {...props} />, {
    wrapper: createWrapper(createQueryClient()),
  });

const press = (name: string) => userEvent.setup().press(screen.getByRole("button", { name }));

beforeEach(() => {
  setupSignedInUser();
  jest.useFakeTimers({ now: new Date("2026-10-20T12:05:00.000Z"), doNotFake: ["nextTick", "setImmediate"] });
});

afterEach(() => jest.useRealTimers());

describe("MessageSheet", () => {
  it("shows a notice: the eyebrow, the sender and the time, the title and the text, and no class", async () => {
    await renderSheet();

    expect(screen.getByText("Message from the school")).toBeOnTheScreen();
    expect(screen.getByText("Ana Souza · 5 minutes ago")).toBeOnTheScreen();
    expect(screen.getByText("Escola fechada no feriado")).toBeOnTheScreen();
    expect(screen.getByText("Não há aulas na terça.")).toBeOnTheScreen();
    expect(screen.queryByTestId("message-sheet-class-loading")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doesn't uppercase the title", async () => {
    await renderSheet();

    expect(screen.getByText("Escola fechada no feriado")).toHaveProp(
      "className",
      expect.stringContaining("ds-text-message-title"),
    );
  });

  it("has no close button", async () => {
    await renderSheet();

    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });

  it("sets the description in the main ink", async () => {
    await renderSheet();

    expect(screen.getByText("Não há aulas na terça.")).toHaveProp(
      "className",
      "ds-text-body text-ink",
    );
  });

  it.each(["OK, got it", "Drag down"])("closes with %s", async (name) => {
    const onClose = jest.fn();
    await renderSheet({ onClose });

    await press(name);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("doesn't let the sender be pressed", async () => {
    await renderSheet();

    expect(screen.queryByRole("button", { name: /Ana Souza/ })).toBeNull();
  });

  it("shows only the time without a sender", async () => {
    await renderSheet({ message: { ...NOTICE, sender: null } });

    expect(screen.getByText("5 minutes ago")).toBeOnTheScreen();
    expect(screen.getByText("Escola fechada no feriado")).toBeOnTheScreen();
  });

  it("shows only the sender for a date it can't read", async () => {
    await renderSheet({ message: { ...NOTICE, createdAt: "nope" } });

    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
  });

  it("shows no subtitle with neither a sender nor a date it can read", async () => {
    await renderSheet({ message: { ...NOTICE, sender: null, createdAt: "nope" } });

    expect(screen.getByText("Message from the school")).toBeOnTheScreen();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("draws nothing before it has a message", async () => {
    await renderSheet({ message: null });

    expect(screen.queryByText("Message from the school")).toBeNull();
  });

  describe("the class", () => {
    it("shows a skeleton, then the class's current data with a chevron, and leads to it", async () => {
      fetchMock.mockResolvedValue(ok(CLASS));
      const onOpenClass = jest.fn();
      await renderSheet({ message: CLASS_MESSAGE, onOpenClass });

      expect(screen.getByTestId("message-sheet-class-loading")).toBeOnTheScreen();

      expect(await screen.findByTestId("message-sheet-class-chevron")).toBeOnTheScreen();
      expect(screen.queryByTestId("message-sheet-class-loading")).toBeNull();
      expect(screen.getByText("The class")).toBeOnTheScreen();
      expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();

      await userEvent.setup().press(screen.getByTestId("message-sheet-class-chevron"));

      expect(onOpenClass).toHaveBeenCalledWith("c-1");
    });

    it("shows the day with an uppercase month and no year", async () => {
      fetchMock.mockResolvedValue(ok(CLASS));
      await renderSheet({ message: CLASS_MESSAGE, onOpenClass: jest.fn() });

      expect(await screen.findByText("21 OCT")).toBeOnTheScreen();
      expect(screen.queryByText(/2026/)).toBeNull();
    });

    it("still shows a cancelled class", async () => {
      fetchMock.mockResolvedValue(ok({ ...CLASS, cancelledAt: "2026-10-20T10:00:00.000Z" }));
      await renderSheet({ message: CLASS_MESSAGE, onOpenClass: jest.fn() });

      expect(await screen.findByText("Praia do Futuro")).toBeOnTheScreen();
    });

    it("keeps the message without the card when the class is gone", async () => {
      fetchMock.mockResolvedValue(failure(404));
      await renderSheet({ message: CLASS_MESSAGE, onOpenClass: jest.fn() });

      await waitFor(() => expect(screen.queryByTestId("message-sheet-class-loading")).toBeNull());

      expect(screen.queryByTestId("message-sheet-class-chevron")).toBeNull();
      expect(screen.queryByText("The class")).toBeNull();
      expect(screen.getByText("Escola fechada no feriado")).toBeOnTheScreen();
    });

    it("reads the class again each time it opens, so a class deleted since shows no card", async () => {
      fetchMock.mockResolvedValue(ok(CLASS));
      const onOpenClass = jest.fn();
      const props = { message: CLASS_MESSAGE, onClose: jest.fn(), onOpenClass };
      const { rerender } = await renderSheet(props);
      await screen.findByTestId("message-sheet-class-chevron");

      fetchMock.mockResolvedValue(failure(404));
      await rerender(<MessageSheet {...props} visible={false} />);
      await rerender(<MessageSheet {...props} visible />);

      await waitFor(() =>
        expect(screen.queryByTestId("message-sheet-class-chevron")).toBeNull(),
      );
      expect(screen.getByText("Escola fechada no feriado")).toBeOnTheScreen();
    });

    it("doesn't read the class while it is closed", async () => {
      await renderSheet({ message: CLASS_MESSAGE, onOpenClass: jest.fn(), visible: false });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("doesn't read the class when the screen can't lead there", async () => {
      await renderSheet({ message: CLASS_MESSAGE });

      expect(screen.queryByTestId("message-sheet-class-loading")).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reads no class for a notice", async () => {
      await renderSheet({ onOpenClass: jest.fn() });

      expect(screen.queryByTestId("message-sheet-class-loading")).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
