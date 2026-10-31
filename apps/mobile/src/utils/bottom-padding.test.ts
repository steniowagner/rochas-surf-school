import { Platform } from "react-native";

import { getBottomPadding, getKeyboardGapOffset } from "./bottom-padding";

describe("getBottomPadding", () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  describe("on iOS", () => {
    beforeEach(() => {
      Platform.OS = "ios";
    });

    it("keeps the inset when the phone has a home indicator", () => {
      expect(getBottomPadding(34, 24)).toBe(34);
    });

    it("uses the minimum on phones without one", () => {
      expect(getBottomPadding(0, 24)).toBe(24);
    });
  });

  describe("on Android", () => {
    beforeEach(() => {
      Platform.OS = "android";
    });

    it.each([
      ["3-button navigation", 48, 60],
      ["2-button navigation", 24, 36],
      ["gesture navigation", 24, 36],
    ])("leaves a gap above the bar with %s", (_mode, inset, expected) => {
      expect(getBottomPadding(inset, 24)).toBe(expected);
    });

    it("uses the minimum when there is no bar", () => {
      expect(getBottomPadding(0, 24)).toBe(24);
    });
  });
});

describe("getKeyboardGapOffset", () => {
  it("takes the padding off, leaving a card gap above the keyboard", () => {
    expect(getKeyboardGapOffset(36)).toBe(-24);
    expect(getKeyboardGapOffset(60)).toBe(-48);
  });
});
