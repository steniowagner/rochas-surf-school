import { act, renderHook } from "@testing-library/react-native";

import i18n from "@/i18n";
import * as api from "@/services/api/api.client";
import {
  readPushEnabledPreference,
  writePushEnabledPreference,
} from "@/services/preferences/preferences.storage";
import * as push from "@/services/push/push.service";

import { usePushPreference } from "./use-push-preference.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));
jest.mock("@/services/api/api.client");
jest.mock("@/services/push/push.service");

const apiPut = jest.mocked(api.apiPut);
const apiDelete = jest.mocked(api.apiDelete);
const getPushToken = jest.mocked(push.getPushToken);
const isPushPermissionDenied = jest.mocked(push.isPushPermissionDenied);
const setRegisteredPushToken = jest.mocked(push.setRegisteredPushToken);
const clearRegisteredPushToken = jest.mocked(push.clearRegisteredPushToken);

describe("usePushPreference", () => {
  beforeEach(() => {
    mockShow.mockReset();
    apiPut.mockReset().mockResolvedValue(undefined);
    apiDelete.mockReset().mockResolvedValue(undefined);
    getPushToken.mockReset().mockResolvedValue("ExponentPushToken[abc]");
    isPushPermissionDenied.mockReset().mockResolvedValue(false);
    setRegisteredPushToken.mockReset();
    clearRegisteredPushToken.mockReset();
  });

  it("starts on, and from the stored choice", async () => {
    const on = await renderHook(() => usePushPreference());
    expect(on.result.current.enabled).toBe(true);

    writePushEnabledPreference(false);
    const off = await renderHook(() => usePushPreference());
    expect(off.result.current.enabled).toBe(false);
  });

  it("turning off stores it and deletes this phone's token", async () => {
    const { result } = await renderHook(() => usePushPreference());

    await act(async () => result.current.setEnabled(false));

    expect(result.current.enabled).toBe(false);
    expect(readPushEnabledPreference()).toBe(false);
    expect(apiDelete).toHaveBeenCalledWith(
      "/notifications/push-token",
      { token: "ExponentPushToken[abc]" },
      { authenticated: true },
    );
    expect(clearRegisteredPushToken).toHaveBeenCalled();
  });

  it("turning off with no token still changes the switch and sends nothing", async () => {
    getPushToken.mockResolvedValue(null);
    const { result } = await renderHook(() => usePushPreference());

    await act(async () => result.current.setEnabled(false));

    expect(result.current.enabled).toBe(false);
    expect(apiDelete).not.toHaveBeenCalled();
  });

  it("turning on stores it and registers at once with the app language", async () => {
    await i18n.changeLanguage("es-ES");
    writePushEnabledPreference(false);
    const { result } = await renderHook(() => usePushPreference());

    await act(async () => result.current.setEnabled(true));

    expect(result.current.enabled).toBe(true);
    expect(readPushEnabledPreference()).toBe(true);
    expect(apiPut).toHaveBeenCalledWith(
      "/notifications/push-token",
      { token: "ExponentPushToken[abc]", locale: "es" },
      { authenticated: true },
    );
    expect(setRegisteredPushToken).toHaveBeenCalledWith("ExponentPushToken[abc]");
  });

  it("turning on with the permission denied goes back off and shows the toast", async () => {
    writePushEnabledPreference(false);
    getPushToken.mockResolvedValue(null);
    isPushPermissionDenied.mockResolvedValue(true);
    const { result } = await renderHook(() => usePushPreference());

    await act(async () => result.current.setEnabled(true));

    expect(result.current.enabled).toBe(false);
    expect(readPushEnabledPreference()).toBe(false);
    expect(mockShow).toHaveBeenCalledWith(
      "Allow notifications for the app in your phone's settings.",
    );
    expect(apiPut).not.toHaveBeenCalled();
  });

  it("turning on with no token and no refusal (a simulator) keeps the switch on", async () => {
    getPushToken.mockResolvedValue(null);
    const { result } = await renderHook(() => usePushPreference());

    await act(async () => result.current.setEnabled(true));

    expect(result.current.enabled).toBe(true);
    expect(mockShow).not.toHaveBeenCalled();
    expect(apiPut).not.toHaveBeenCalled();
  });

  it("keeps the switch on when registering fails", async () => {
    apiPut.mockRejectedValue(new Error("offline"));
    const { result } = await renderHook(() => usePushPreference());

    await act(async () => result.current.setEnabled(true));

    expect(result.current.enabled).toBe(true);
    expect(setRegisteredPushToken).not.toHaveBeenCalled();
  });
});
