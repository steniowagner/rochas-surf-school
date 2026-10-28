import { act, renderHook } from "@testing-library/react-native";

import * as api from "@/services/api";

import { buildPerson, createQueryClient, createWrapper } from "../../people.test-utils";

import { usePersonSheet } from "./person-sheet.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPut: jest.fn(), apiPost: jest.fn() };
});

const renderSheetHook = (person: Parameters<typeof usePersonSheet>[0]["person"], onClose = jest.fn()) =>
  renderHook(() => usePersonSheet({ person, onClose }), {
    wrapper: createWrapper(createQueryClient()),
  });

describe("usePersonSheet", () => {
  beforeEach(() => {
    mockShow.mockReset();
    jest.mocked(api.apiPut).mockReset();
    jest.mocked(api.apiPost).mockReset();
  });

  it("sends nothing without a chosen action, without a person or without the person's id", async () => {
    const { name, role, whatsappNumber } = buildPerson(1);
    const withoutAction = await renderSheetHook(buildPerson(1));
    const withoutPerson = await renderSheetHook(null);
    const withoutId = await renderSheetHook({ name, role, whatsappNumber });

    await act(async () => {
      withoutPerson.result.current.selectRoleAction("promoteInstructor");
      withoutId.result.current.selectRoleAction("promoteInstructor");
    });
    await act(async () => {
      await withoutAction.result.current.confirmRoleChange(false);
      await withoutPerson.result.current.confirmRoleChange(false);
      await withoutId.result.current.confirmRoleChange(false);
    });

    expect(api.apiPut).not.toHaveBeenCalled();
    expect(withoutPerson.result.current.firstName).toBe("");
  });

  it("shows no toast when the session expired: it is handled once, centrally", async () => {
    jest.mocked(api.apiPut).mockRejectedValue(new api.SessionExpiredError());
    const onClose = jest.fn();
    const { result } = await renderSheetHook(buildPerson(1, { name: "Ana Silva" }), onClose);

    await act(async () => result.current.selectRoleAction("promoteAdmin"));
    await act(async () => {
      await result.current.confirmRoleChange(false);
    });

    expect(api.apiPut).toHaveBeenCalledWith("/people/p-1/role", { role: "admin", isInstructor: false }, { authenticated: true });
    expect(mockShow).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.roleAction).toBe("promoteAdmin");
    expect(result.current.firstName).toBe("Ana");
  });

  it("sends no removal without a person, without the person's id or before the confirmation opened", async () => {
    const { name, role, whatsappNumber } = buildPerson(1);
    const notConfirming = await renderSheetHook(buildPerson(1));
    const withoutPerson = await renderSheetHook(null);
    const withoutId = await renderSheetHook({ name, role, whatsappNumber });

    await act(async () => {
      withoutPerson.result.current.startRemoval();
      withoutId.result.current.startRemoval();
    });
    await act(async () => {
      await notConfirming.result.current.confirmRemoval();
      await withoutPerson.result.current.confirmRemoval();
      await withoutId.result.current.confirmRemoval();
    });

    expect(api.apiPost).not.toHaveBeenCalled();
  });

  it("shows no toast when the session expired during a removal", async () => {
    jest.mocked(api.apiPost).mockRejectedValue(new api.SessionExpiredError());
    const onClose = jest.fn();
    const { result } = await renderSheetHook(buildPerson(1), onClose);

    await act(async () => result.current.startRemoval());
    await act(async () => {
      await result.current.confirmRemoval();
    });

    expect(mockShow).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closing resets the removal confirmation", async () => {
    const { result } = await renderSheetHook(buildPerson(1));

    await act(async () => result.current.startRemoval());
    expect(result.current.isConfirmingRemoval).toBe(true);
    await act(async () => result.current.close());

    expect(result.current.isConfirmingRemoval).toBe(false);
  });
});
