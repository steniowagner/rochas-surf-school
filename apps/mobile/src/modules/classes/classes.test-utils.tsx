import { Ionicons } from "@expo/vector-icons";

export {
  createQueryClient,
  createWrapper,
  failure,
  fetchMock,
  ok,
  requestedPaths,
  setupSignedInUser,
} from "@/modules/people/people.test-utils";

// The character an Ionicons icon renders, to find the icon by text in a test.
export const glyph = (name: keyof typeof Ionicons.glyphMap) =>
  String.fromCodePoint(Number(Ionicons.glyphMap[name]));
