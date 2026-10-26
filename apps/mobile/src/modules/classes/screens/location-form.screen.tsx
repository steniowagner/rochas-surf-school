import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextInput } from "@/components/ui/text-input";
import { shadowStyle } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { usePinnedFooter } from "@/modules/school-settings/hooks/use-pinned-footer.hook";

import { ArchiveLocationSheet } from "../components/archive-location-sheet";
import { LocationAddressCard } from "../components/location-address-card";
import { LocationSearchHeader } from "../components/location-search-header";
import { MyLocationButton } from "../components/my-location-button";
import { getMapProvider } from "../utils/map";

import { useLocationFormScreen } from "./location-form.screen.hook";

/**
 * "Novo local" / "Editar local" on a full-screen map, like a maps app: the search in the header, a tap on the map (or,
 * on Android, on a labelled place) picks the point, "my location" centres the map on the device, and a fixed panel at
 * the bottom holds the address, the name and the actions; it rises with the keyboard.
 */
export function LocationFormScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const footerStyle = usePinnedFooter(Math.max(insets.bottom, 16));
  const screen = useLocationFormScreen();
  const { fields } = screen;

  return (
    <View className="flex-1 bg-page">
      {/* The map runs under the header on every platform; the search field sits in it. */}
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
        }}
      />
      <MapView
        testID="location-form-map"
        style={StyleSheet.absoluteFill}
        provider={getMapProvider()}
        region={screen.region}
        mapPadding={screen.mapPadding}
        showsUserLocation={screen.showsUserLocation}
        showsMyLocationButton={false}
        onRegionChangeComplete={screen.changeRegion}
        onPress={screen.pressMap}
        // Only Google Maps reports taps on its labelled places.
        onPoiClick={Platform.OS === "android" ? screen.pressPoi : undefined}
      >
        {screen.pin ? (
          <Marker testID="location-form-pin" coordinate={screen.pin} />
        ) : null}
      </MapView>
      <Animated.View
        className="absolute bottom-0 left-0 right-0 gap-3"
        style={footerStyle}
        pointerEvents="box-none"
      >
        <View className="items-end px-screen" pointerEvents="box-none">
          <MyLocationButton onPress={screen.centreOnDevice} />
        </View>
        <View
          testID="location-form-panel"
          className="gap-4 rounded-sheet bg-page px-screen pb-2 pt-5"
          style={shadowStyle("menuOption", theme)}
          onLayout={screen.measurePanel}
        >
          <Text className="ds-text-sheet-title text-ink">
            {screen.editing
              ? t("locationSheet.editTitle")
              : t("locationSheet.title")}
          </Text>
          <LocationAddressCard
            place={fields.place}
            resolving={screen.resolving}
            pendingPoint={screen.pendingPoint}
          />
          <View className="gap-1.5">
            <Text className="ds-text-section-label text-ink-2">
              {t("locationSheet.name")}
            </Text>
            <TextInput
              icon={
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={theme.ink2}
                />
              }
              accessibilityLabel={t("locationSheet.name")}
              placeholder={t("locationSheet.namePlaceholder")}
              value={fields.name}
              maxLength={screen.nameMaxLength}
              onChangeText={screen.changeName}
              status={screen.duplicate ? "error" : "neutral"}
              errorMessage={t("locationSheet.duplicate")}
            />
          </View>
          {screen.showNotify ? (
            <View>
              <Checkbox
                checked={fields.notify}
                onChange={screen.changeNotify}
                label={t("locationSheet.notify")}
              />
              <Text className="ds-text-list-subtitle px-1 text-ink-2">
                {t("locationSheet.notifyCount", {
                  count: screen.upcomingClasses,
                })}
              </Text>
            </View>
          ) : null}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onPress={screen.cancel}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              loading={screen.loading}
              disabled={!screen.canSubmit}
              onPress={screen.submit}
            >
              {screen.editing
                ? t("locationSheet.save")
                : t("locationSheet.submit")}
            </Button>
          </View>
          {screen.editing ? (
            <Button variant="ghost" onPress={screen.openArchive}>
              {t("locationSheet.remove")}
            </Button>
          ) : null}
        </View>
      </Animated.View>
      <LocationSearchHeader
        sessionToken={screen.sessionToken}
        onPick={screen.pickSuggestion}
      />
      {screen.location ? (
        <ArchiveLocationSheet
          visible={screen.archiveVisible}
          name={screen.location.name}
          address={screen.location.address}
          upcomingClasses={screen.upcomingClasses}
          loading={screen.archiving}
          onConfirm={screen.confirmArchive}
          onClose={screen.closeArchive}
        />
      ) : null}
    </View>
  );
}
