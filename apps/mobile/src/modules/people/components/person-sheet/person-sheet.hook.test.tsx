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

  return { ...actual, apiPut: jest.fn() };
});

const renderSheetHook = (person: Parameters<typeof usePersonSheet>[0]["person"], onClose = jest.fn()) =>
  renderHook(() => usePersonSheet({ person, onClose }), {
    wrapper: createWrapper(createQueryClient()),
  });

describe("usePersonSheet", () => {
  beforeEach(() => {
    mockShow.mockReset();
    jest.mocked(api.apiPut).mockReset();
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
      await withoutAction.result.current.confirmRoleChange();
      await withoutPerson.result.current.confirmRoleChange();
      await withoutId.result.current.confirmRoleChange();
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
      await result.current.confirmRoleChange();
    });

    expect(api.apiPut).toHaveBeenCalledWith("/people/p-1/role", { role: "admin" }, { authenticated: true });
    expect(mockShow).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.roleAction).toBe("promoteAdmin");
    expect(result.current.firstName).toBe("Ana");
  });
});
