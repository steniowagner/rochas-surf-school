import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PeopleScreen } from "@/modules/people/screens/people.screen";

export default function SchoolRoute() {
  const insets = useSafeAreaInsets();

  // A tab root has no header: on Android the content starts below the status bar.
  return (
    <View
      className="flex-1 bg-page"
      style={{ paddingTop: Platform.OS === "android" ? insets.top : 0 }}
    >
      <PeopleScreen />
    </View>
  );
}
