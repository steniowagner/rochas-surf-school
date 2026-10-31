import { renderHook } from "@testing-library/react-native";
import { openBrowserAsync } from "expo-web-browser";

import i18n from "@/i18n";
import { useAlertMessage } from "@/providers/alert-message";

import { useLegalPages } from "./use-legal-pages.hook";

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn() }));
jest.mock("@/providers/alert-message", () => ({ useAlertMessage: jest.fn() }));

const show = jest.fn();

describe("useLegalPages", () => {
  const original = process.env.EXPO_PUBLIC_WEB_URL;

  beforeEach(async () => {
    process.env.EXPO_PUBLIC_WEB_URL = "http://localhost:3000";
    show.mockClear();
    jest.mocked(useAlertMessage).mockReturnValue({ show } as never);
    jest
      .mocked(openBrowserAsync)
      .mockReset()
      .mockResolvedValue({ type: "dismiss" } as never);
    await i18n.changeLanguage("en-US");
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_WEB_URL = original;
  });

  it("opens each page in the app's language", async () => {
    await i18n.changeLanguage("pt-BR");
    const { result } = await renderHook(() => useLegalPages());

    result.current.onTermsPress();
    result.current.onPrivacyPress();

    expect(openBrowserAsync).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/pt-br/terms-of-use",
    );
    expect(openBrowserAsync).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/pt-br/privacy-policy",
    );
    expect(show).not.toHaveBeenCalled();
  });

  it("shows the generic message when the web address isn't set", async () => {
    delete process.env.EXPO_PUBLIC_WEB_URL;
    const { result } = await renderHook(() => useLegalPages());

    result.current.onTermsPress();

    expect(openBrowserAsync).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledTimes(1);
  });
});
