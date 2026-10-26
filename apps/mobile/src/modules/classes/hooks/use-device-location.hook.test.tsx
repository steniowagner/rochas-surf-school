import { act, renderHook } from "@testing-library/react-native";
import {
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
} from "expo-location";

import i18n from "@/i18n";

import { useDeviceLocation } from "./use-device-location.hook";

const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const mockRequest = jest.mocked(requestForegroundPermissionsAsync);
const mockPosition = jest.mocked(getCurrentPositionAsync);

const DENIED_TOAST = "Allow location access in Settings to use your position.";

beforeEach(() => {
  mockShow.mockReset();
  mockRequest.mockClear();
  mockPosition.mockClear();
});

describe("useDeviceLocation", () => {
  it("asks nothing until the admin taps the button", async () => {
    const { result } = await renderHook(() => useDeviceLocation());

    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current.granted).toBe(false);
  });

  it("asks for the foreground permission and gives the device's position once granted", async () => {
    mockPosition.mockResolvedValueOnce({
      coords: { latitude: -3.75, longitude: -38.48 },
    } as never);
    const { result } = await renderHook(() => useDeviceLocation());

    let point: unknown;
    await act(async () => {
      point = await result.current.locate();
    });

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(mockPosition).toHaveBeenCalledWith({
      accuracy: 3,
      mayShowUserSettingsDialog: false,
    });
    expect(point).toEqual({ latitude: -3.75, longitude: -38.48 });
    expect(result.current.granted).toBe(true);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows the toast and gives nothing when the permission is denied", async () => {
    mockRequest.mockResolvedValueOnce({
      status: "denied",
      granted: false,
    } as never);
    const { result } = await renderHook(() => useDeviceLocation());

    let point: unknown;
    await act(async () => {
      point = await result.current.locate();
    });

    expect(point).toBeNull();
    expect(mockPosition).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith(DENIED_TOAST);
    expect(result.current.granted).toBe(false);
  });

  it("shows the same toast and gives nothing when the position can't be read", async () => {
    mockPosition.mockRejectedValueOnce(new Error("location off"));
    const { result } = await renderHook(() => useDeviceLocation());

    let point: unknown;
    await act(async () => {
      point = await result.current.locate();
    });

    expect(point).toBeNull();
    expect(mockShow).toHaveBeenCalledWith(DENIED_TOAST);
  });

  it("shows the toast in Portuguese", async () => {
    await i18n.changeLanguage("pt-BR");
    mockRequest.mockRejectedValueOnce(new Error("no module"));
    const { result } = await renderHook(() => useDeviceLocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(mockShow).toHaveBeenCalledWith(
      "Permita o acesso à localização nos Ajustes para usar sua posição.",
    );
  });
});
