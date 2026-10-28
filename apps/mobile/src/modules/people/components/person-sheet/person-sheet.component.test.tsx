import { act, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { ReactElement } from "react";
import { Linking } from "react-native";

import { NetworkError } from "@/services/api";

import {
  buildPerson,
  createQueryClient,
  createWrapper,
  fetchMock,
  ok,
  setupSignedInUser,
} from "../../people.test-utils";

import { PersonSheet } from "./person-sheet.component";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const renderSheet = (ui: ReactElement) =>
  render(ui, { wrapper: createWrapper(createQueryClient()) });

const conflict = (key: string) => ({
  ok: false,
  status: 409,
  json: async () => ({ errors: [key] }),
});

const shared = buildPerson(1, {
  name: "João Pinto",
  role: "instructor",
  whatsappNumber: "+5585999998888",
});

describe("PersonSheet", () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    mockShow.mockReset();
    openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  });

  afterEach(() => openURL.mockRestore());

  it("shows the person and the WhatsApp row with the formatted number", async () => {
    await renderSheet(<PersonSheet person={shared} visible onClose={jest.fn()} />);

    expect(screen.getByText("JP")).toBeOnTheScreen();
    expect(screen.getByText("João Pinto")).toBeOnTheScreen();
    expect(screen.getByText("Instructor")).toBeOnTheScreen();
    expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
    expect(screen.getByText("+55 85 99999 8888")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Close" })).toBeOnTheScreen();
  });

  it("shows an email row instead of the WhatsApp row when an email is given", async () => {
    await renderSheet(
      <PersonSheet
        person={{ ...shared, role: "student", whatsappNumber: null }}
        email="ana@example.com"
        visible
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByText("Email")).toBeOnTheScreen();
    expect(screen.getByText("ana@example.com")).toBeOnTheScreen();
    expect(screen.queryByText("Chat on WhatsApp")).toBeNull();
    expect(screen.queryByText("Number not shared.")).toBeNull();
  });

  it("opens the chat on WhatsApp", async () => {
    const user = userEvent.setup();
    await renderSheet(<PersonSheet person={shared} visible onClose={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Chat on WhatsApp" }));

    expect(openURL).toHaveBeenCalledWith("https://wa.me/5585999998888");
  });

  it("shows a toast when WhatsApp can't be opened", async () => {
    openURL.mockRejectedValue(new Error("no app"));
    const user = userEvent.setup();
    await renderSheet(<PersonSheet person={shared} visible onClose={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Chat on WhatsApp" }));

    expect(mockShow).toHaveBeenCalledWith("Couldn't open WhatsApp.");
  });

  it("shows a disabled WhatsApp row saying the number isn't shared, and a filled Close button", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await renderSheet(
      <PersonSheet person={buildPerson(2, { whatsappNumber: null })} visible onClose={onClose} />,
    );

    expect(screen.getByText("Chat on WhatsApp")).toBeOnTheScreen();
    expect(screen.getByText("Number not shared.")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Chat on WhatsApp" })).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(openURL).not.toHaveBeenCalled();
  });

  it("shows a number that can't be parsed as sent", async () => {
    await renderSheet(
      <PersonSheet person={buildPerson(3, { whatsappNumber: "12345" })} visible onClose={jest.fn()} />,
    );

    expect(screen.getByText("12345")).toBeOnTheScreen();
  });

  it("closes with the Close button", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await renderSheet(<PersonSheet person={shared} visible onClose={onClose} />);

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders no content without a person", async () => {
    await renderSheet(<PersonSheet person={null} visible={false} onClose={jest.fn()} />);

    expect(screen.queryByText("Close")).not.toBeOnTheScreen();
  });

  describe("role actions", () => {
    beforeEach(setupSignedInUser);

    it.each([
      ["student", ["Make instructor", "Make admin"], ["Can be assigned to classes.", "Runs the school."]],
      ["instructor", ["Make admin", "Make student"], ["Runs the school.", "Leaves the upcoming classes they teach."]],
      ["admin", ["Remove admin"], ["Stops running the school."]],
    ] as const)("shows the role actions of a %s below the contact row", async (role, titles, subtitles) => {
      await renderSheet(
        <PersonSheet person={buildPerson(1, { role })} canChangeRole visible onClose={jest.fn()} />,
      );

      for (const title of titles) {
        expect(screen.getByRole("button", { name: title })).toBeOnTheScreen();
      }
      for (const subtitle of subtitles) {
        expect(screen.getByText(subtitle)).toBeOnTheScreen();
      }
      const all = ["Make instructor", "Make admin", "Make student", "Remove admin"];
      for (const other of all.filter((title) => !(titles as readonly string[]).includes(title))) {
        expect(screen.queryByRole("button", { name: other })).not.toBeOnTheScreen();
      }
    });

    it("draws the actions that take something away in the danger tone", async () => {
      await renderSheet(
        <PersonSheet person={buildPerson(1, { role: "instructor" })} canChangeRole visible onClose={jest.fn()} />,
      );

      expect(screen.getByText("Make student").props.className).toContain("text-bad");
      expect(screen.getByText("Make admin").props.className).toContain("text-ink");
    });

    it("shows no role action without canChangeRole, or without the person's id", async () => {
      const { name, role, whatsappNumber } = buildPerson(1);
      await renderSheet(<PersonSheet person={buildPerson(1)} visible onClose={jest.fn()} />);
      expect(screen.queryByRole("button", { name: "Make instructor" })).not.toBeOnTheScreen();

      await renderSheet(
        <PersonSheet person={{ name, role, whatsappNumber }} canChangeRole visible onClose={jest.fn()} />,
      );
      expect(screen.queryByRole("button", { name: "Make instructor" })).not.toBeOnTheScreen();
    });

    it("still closes with the Close button", async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();
      await renderSheet(<PersonSheet person={buildPerson(1)} canChangeRole visible onClose={onClose} />);

      await user.press(screen.getByRole("button", { name: "Close" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("confirm", () => {
    beforeEach(setupSignedInUser);

    const ana = buildPerson(7, { name: "Ana Silva", role: "student" });

    const openConfirmation = async (person = ana, action = "Make instructor", onClose = jest.fn()) => {
      const user = userEvent.setup();
      await renderSheet(<PersonSheet person={person} canChangeRole visible onClose={onClose} />);
      await user.press(screen.getByRole("button", { name: action }));
      return { user, onClose };
    };

    it("swaps the details for the confirmation, with the first name, the description and two buttons", async () => {
      await openConfirmation();

      expect(screen.getByText("Make Ana an instructor?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "They become an instructor: they can be assigned to classes and see who's enrolled. The seats and requests they had in upcoming classes, as a student, are cancelled.",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Make instructor" })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
      expect(screen.queryByText("Chat on WhatsApp")).not.toBeOnTheScreen();
    });

    it("puts the new role and closes the sheet on confirm", async () => {
      fetchMock.mockResolvedValue(ok({ id: ana.id, role: "instructor" }));
      const { user, onClose } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Make instructor" }));

      expect(fetchMock).toHaveBeenCalledWith(
        `http://api.test/people/${ana.id}/role`,
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ role: "instructor" }) }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockShow).not.toHaveBeenCalled();
      // Back on the details for the next time it opens.
      expect(screen.getByText("Ana Silva")).toBeOnTheScreen();
    });

    it("goes back to the details without a request", async () => {
      const { user, onClose } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByText("Ana Silva")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Make instructor" })).toBeOnTheScreen();
      expect(screen.queryByText("Make Ana an instructor?")).not.toBeOnTheScreen();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("makes an admin who does not teach by default, and one who does when the box is checked", async () => {
      fetchMock.mockResolvedValue(ok({ id: ana.id, role: "admin", isInstructor: false }));
      const first = await openConfirmation(ana, "Make admin");
      await first.user.press(screen.getByRole("button", { name: "Make admin" }));

      expect(fetchMock).toHaveBeenLastCalledWith(
        `http://api.test/people/${ana.id}/role`,
        expect.objectContaining({ body: JSON.stringify({ role: "admin", isInstructor: false }) }),
      );
    });

    it("sends isInstructor true when the box is checked, and starts unchecked every time", async () => {
      fetchMock.mockResolvedValue(ok({ id: ana.id, role: "admin", isInstructor: true }));
      const { user } = await openConfirmation(ana, "Make admin");

      await user.press(screen.getByRole("checkbox", { name: "Also an instructor" }));
      await user.press(screen.getByRole("button", { name: "Back" }));
      await user.press(screen.getByRole("button", { name: "Make admin" }));
      expect(screen.getByRole("checkbox", { name: "Also an instructor" })).not.toBeChecked();

      await user.press(screen.getByRole("checkbox", { name: "Also an instructor" }));
      await user.press(screen.getByRole("button", { name: "Make admin" }));

      expect(fetchMock).toHaveBeenLastCalledWith(
        `http://api.test/people/${ana.id}/role`,
        expect.objectContaining({ body: JSON.stringify({ role: "admin", isInstructor: true }) }),
      );
    });

    it("adds the seats note when a student is made admin", async () => {
      await openConfirmation(ana, "Make admin");

      expect(screen.getByText("Make Ana an admin?")).toBeOnTheScreen();
      expect(
        screen.getByText("The seats and requests they had in upcoming classes, as a student, are cancelled."),
      ).toBeOnTheScreen();
    });

    it("leaves the seats note out when an instructor is made admin", async () => {
      await openConfirmation({ ...ana, role: "instructor" }, "Make admin");

      expect(screen.getByText("Make Ana an admin?")).toBeOnTheScreen();
      expect(
        screen.queryByText("The seats and requests they had in upcoming classes, as a student, are cancelled."),
      ).not.toBeOnTheScreen();
    });

    it.each([
      ["Make student", "instructor", "Make Ana a student?", "student"],
      ["Remove admin", "admin", "Remove Ana as admin?", "instructor"],
    ] as const)("confirms %s for a %s", async (action, role, title, target) => {
      fetchMock.mockResolvedValue(ok({ id: ana.id, role: target }));
      const { user, onClose } = await openConfirmation({ ...ana, role }, action);

      expect(screen.getByText(title)).toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: action }));

      expect(fetchMock).toHaveBeenCalledWith(
        `http://api.test/people/${ana.id}/role`,
        expect.objectContaining({ body: JSON.stringify({ role: target }) }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["user.role.changeNotAllowed", "This person's role changed. Refresh the list."],
      ["user.role.lastAdmin", "The school needs at least one admin."],
      ["user.status.notApproved", "This person is no longer on the platform."],
      ["something.else", "Something went wrong. Please try again."],
    ])("toasts a 409 %s and stays on the confirmation", async (key, message) => {
      fetchMock.mockResolvedValue(conflict(key));
      const { user, onClose } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Make instructor" }));

      expect(mockShow).toHaveBeenCalledWith(message);
      expect(screen.getByText("Make Ana an instructor?")).toBeOnTheScreen();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("toasts no connection", async () => {
      fetchMock.mockRejectedValue(new NetworkError());
      const { user } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Make instructor" }));

      expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
    });

    it("sends nothing more on a second tap while the request runs", async () => {
      let answer!: (value: unknown) => void;
      fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      const { user, onClose } = await openConfirmation();
      const confirm = screen.getByRole("button", { name: "Make instructor" });

      await user.press(confirm);
      await user.press(confirm);
      answer(ok({ id: ana.id, role: "instructor" }));
      await screen.findByText("Ana Silva");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("instructor flag", () => {
    beforeEach(setupSignedInUser);

    const bia = buildPerson(9, { name: "Bia Admin", role: "admin", isInstructor: false });
    const row = () => screen.getByRole("checkbox", { name: "Also an instructor" });

    const renderFlagSheet = async (person = bia, canSetInstructorFlag = true) => {
      const user = userEvent.setup();
      await renderSheet(
        <PersonSheet person={person} canSetInstructorFlag={canSetInstructorFlag} visible onClose={jest.fn()} />,
      );
      return user;
    };

    it("shows the row with its helper, checked from the person, only when asked", async () => {
      await renderFlagSheet({ ...bia, isInstructor: true });

      expect(row()).toBeChecked();
      expect(
        screen.getByText("Shows in the instructor list when creating and editing classes."),
      ).toBeOnTheScreen();
    });

    it("shows no row without canSetInstructorFlag, or without the person's id", async () => {
      await renderFlagSheet(bia, false);
      expect(screen.queryByRole("checkbox")).not.toBeOnTheScreen();
    });

    it("sends the opposite value on a tap and shows the new state with no toast", async () => {
      fetchMock.mockResolvedValue(ok({ id: bia.id, isInstructor: true }));
      const user = await renderFlagSheet();
      expect(row()).not.toBeChecked();

      await user.press(row());

      expect(fetchMock).toHaveBeenCalledWith(
        `http://api.test/people/${bia.id}/instructor`,
        expect.objectContaining({ method: "PUT", body: JSON.stringify({ isInstructor: true }) }),
      );
      await waitFor(() => expect(row()).toBeChecked());
      expect(mockShow).not.toHaveBeenCalled();

      fetchMock.mockResolvedValue(ok({ id: bia.id, isInstructor: false }));
      await user.press(row());

      expect(fetchMock).toHaveBeenLastCalledWith(
        `http://api.test/people/${bia.id}/instructor`,
        expect.objectContaining({ body: JSON.stringify({ isInstructor: false }) }),
      );
      await waitFor(() => expect(row()).not.toBeChecked());
    });

    it.each([
      ["user.role.changeNotAllowed", "This person's role changed. Refresh the list."],
      ["people.isInstructor.notAdmin", "This person's role changed. Refresh the list."],
      ["user.status.notApproved", "This person is no longer on the platform."],
    ])("toasts a 409 %s and keeps the previous state", async (key, message) => {
      fetchMock.mockResolvedValue(conflict(key));
      const user = await renderFlagSheet();

      await user.press(row());

      expect(mockShow).toHaveBeenCalledWith(message);
      expect(row()).not.toBeChecked();
    });

    it("toasts a network failure and keeps the previous state", async () => {
      fetchMock.mockRejectedValue(new TypeError("Network request failed"));
      const user = await renderFlagSheet({ ...bia, isInstructor: true });

      await user.press(row());

      expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
      expect(row()).toBeChecked();
    });

    it("disables the row while it saves and sends one request for two taps", async () => {
      let finish!: (value: unknown) => void;
      fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
      const user = await renderFlagSheet();

      await user.press(row());
      await user.press(row());

      expect(row()).toBeDisabled();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await act(async () => finish(ok({ id: bia.id, isInstructor: true })));
    });
  });

  describe("remove action", () => {
    beforeEach(setupSignedInUser);

    it.each(["student", "instructor", "admin"] as const)(
      "ends the actions of a %s with Remove from the platform and its subtitle",
      async (role) => {
        await renderSheet(
          <PersonSheet person={buildPerson(1, { role })} canChangeRole visible onClose={jest.fn()} />,
        );

        const buttons = screen.getAllByRole("button").map((item) => item.props.accessibilityLabel);
        expect(buttons.at(-2)).toBe("Remove from the platform");
        expect(buttons.at(-1)).toBe("Close");
        expect(screen.getByText("Loses access to the app. Can be restored for 30 days.")).toBeOnTheScreen();
        expect(screen.getByText("Remove from the platform").props.className).toContain("text-bad");
      },
    );

    it("is not shown without canChangeRole, or without the person's id", async () => {
      const { name, role, whatsappNumber } = buildPerson(1);
      await renderSheet(<PersonSheet person={buildPerson(1)} visible onClose={jest.fn()} />);
      expect(screen.queryByRole("button", { name: "Remove from the platform" })).not.toBeOnTheScreen();

      await renderSheet(
        <PersonSheet person={{ name, role, whatsappNumber }} canChangeRole visible onClose={jest.fn()} />,
      );
      expect(screen.queryByRole("button", { name: "Remove from the platform" })).not.toBeOnTheScreen();
    });

    it.each([
      ["student", "Loses access to the app. Their seats become free and don't go to the waiting list automatically. You can restore the account for 30 days."],
      ["instructor", "Leaves the upcoming classes they're assigned to and loses access to the app. You can restore the account for 30 days."],
      ["admin", "Leaves the upcoming classes they're assigned to and loses access to the app. You can restore the account for 30 days."],
    ] as const)("asks 'Remove Ana?' with the text of a %s, and Back returns to the details", async (role, text) => {
      const user = userEvent.setup();
      await renderSheet(
        <PersonSheet
          person={buildPerson(7, { name: "Ana Silva", role })}
          canChangeRole
          visible
          onClose={jest.fn()}
        />,
      );

      await user.press(screen.getByRole("button", { name: "Remove from the platform" }));

      expect(screen.getByText("Remove Ana?")).toBeOnTheScreen();
      expect(screen.getByText(text)).toBeOnTheScreen();
      expect(screen.queryByText("Chat on WhatsApp")).not.toBeOnTheScreen();
      await user.press(screen.getByRole("button", { name: "Back" }));

      expect(screen.getByText("Ana Silva")).toBeOnTheScreen();
      expect(screen.queryByText("Remove Ana?")).not.toBeOnTheScreen();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("confirm removal", () => {
    beforeEach(setupSignedInUser);

    const ana = buildPerson(7, { name: "Ana Silva", role: "student" });

    const openConfirmation = async (onClose = jest.fn()) => {
      const user = userEvent.setup();
      await renderSheet(<PersonSheet person={ana} canChangeRole visible onClose={onClose} />);
      await user.press(screen.getByRole("button", { name: "Remove from the platform" }));
      return { user, onClose };
    };

    it("posts the removal once, closes the sheet and reloads, with no toast", async () => {
      fetchMock.mockResolvedValue(ok({ id: ana.id, status: "removed" }));
      const { user, onClose } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Remove from the platform" }));

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        `http://api.test/people/${ana.id}/remove`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(mockShow).not.toHaveBeenCalled();
      // Back on the details for the next time it opens.
      expect(screen.getByText("Ana Silva")).toBeOnTheScreen();
    });

    it.each([
      ["user.role.lastAdmin", "The school needs at least one admin."],
      ["user.status.notApproved", "This person is no longer on the platform."],
      ["something.else", "Something went wrong. Please try again."],
    ])("toasts a 409 %s and keeps the confirmation open", async (key, message) => {
      fetchMock.mockResolvedValue(conflict(key));
      const { user, onClose } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Remove from the platform" }));

      expect(mockShow).toHaveBeenCalledWith(message);
      expect(screen.getByText("Remove Ana?")).toBeOnTheScreen();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("toasts no connection and keeps the confirmation open", async () => {
      fetchMock.mockRejectedValue(new NetworkError());
      const { user } = await openConfirmation();

      await user.press(screen.getByRole("button", { name: "Remove from the platform" }));

      expect(mockShow).toHaveBeenCalledWith("No connection. Check your internet and try again.");
      expect(screen.getByText("Remove Ana?")).toBeOnTheScreen();
    });

    it("sends nothing more on a second tap while the request runs", async () => {
      let answer!: (value: unknown) => void;
      fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      const { user, onClose } = await openConfirmation();
      const confirm = screen.getByRole("button", { name: "Remove from the platform" });

      await user.press(confirm);
      await user.press(confirm);
      answer(ok({ id: ana.id, status: "removed" }));
      await screen.findByText("Ana Silva");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
