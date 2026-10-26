---
id: "065"
slug: location-map-screen
title: Pick and edit a class location on a full-screen map
template: quick
status: in-progress
created: 2026-10-26
started: 2026-10-26
base_commit: 8dc140119415e540cf61d2645a378a7600130d49
fronts: [mobile]
depends_on: []
---

# 065 — Pick and edit a class location on a full-screen map

## Goal

On "Nova aula" and "Editar aula", admins add ("Novo local") and edit ("Editar local") a saved location on a
full-screen map, like a maps app: the search sits in the header, a tap on the map picks the place, and a "my
location" button centres the map on the device. This screen replaces the location bottom sheet, whose small map
and stacked fields are hard to use.

## Context

- Requirements: [requirements.md → Saved locations](../../../.docs/requirements.md#saved-locations) — locations
  are added with address suggestions and a map; [requirements.md → Editing a location](../../../.docs/requirements.md#editing-a-location),
  [Notifying about a location change](../../../.docs/requirements.md#notifying-about-a-location-change) and
  [Removing the selected location while creating classes](../../../.docs/requirements.md#removing-the-selected-location-while-creating-classes)
  — kept as they are, on the new screen.
- Module memory: [modules/classes.md](../../memory/modules/classes.md) (the location sheet of spec 037).
- Existing code this changes (all in `apps/mobile/src/modules/classes/`):
  - `components/location-sheet/` — the "Novo local" / "Editar local" `BottomModal`: name, address with
    suggestions (`AddressSearchField`), a 170 px map (`LocationMapPicker`), the notify checkbox and "Remover local"
    (`ArchiveLocationSheet`). Its hook holds the form rules (duplicate name, required point, save errors, archive)
    that the new screen keeps.
  - `hooks/use-location-management.hook.ts` — the "Gerir" mode and the sheet's visibility, used by
    `screens/new-class.screen.hook.ts` and `screens/edit-class.screen.hook.ts`, which render `<LocationSheet>` and
    select the created location (`onCreated`) or clear a removed one (`onRemoved`).
  - `hooks/use-address-suggestions.hook.ts` / `hooks/use-address-place.hook.ts` — the backend's Google Places
    suggestions and place lookup, one session token per opening. The backend asks Google's Places Autocomplete,
    which returns at most 5 suggestions.
  - `utils/map.ts` — `regionAround`, `FORTALEZA`, `getMapProvider` (Apple Maps on iOS, Google Maps on Android).
- The stack header (`src/navigation/stack-header/`) draws the back button; `expo-location` isn't installed yet.

## Scope

- In: the new admin route and screen for creating and editing a location; the header search; picking on the map;
  the "my location" button and its permission; wiring "Nova aula" and "Editar aula" to it; deleting the sheet and
  the components only it uses.
- Out: backend changes (suggestions, place lookup and the locations API stay as they are); a draggable bottom
  panel; asking for the location when the screen opens; showing the archived location of a class on the map.

## Decisions

| ID | Decision | Reason |
| --- | --- | --- |
| D-01 | One screen serves "Novo local" and "Editar local"; edit keeps the notify checkbox and "Remover local" with `ArchiveLocationSheet`. `LocationSheet`, `LocationMapPicker` and `AddressSearchField` are deleted. | One form instead of two; the edit rules of spec 037 stay. |
| D-02 | Route `src/app/(private)/admin/location-form.tsx`, `?id=<locationId>` for edit; the screen reads the location and the duplicate list from `useLocations()`. An `id` that isn't among the active locations shows the "gone" toast and goes back. | Admin-only flow, so it lives in the admin group; the list is already cached by the class form. |
| D-03 | The screen tells the class form about a created or removed location through `utils/location-events.ts` (`emitLocationCreated`, `emitLocationRemoved`, `subscribeLocationEvents`); "Nova aula" and "Editar aula" subscribe while mounted. | A pushed route can't call the form's callbacks; the new location must still be selected automatically, and a removed selection cleared. |
| D-04 | The search field is the header's `headerTitle`, on the transparent shared header with the default back button; the map spans the whole screen under it. Suggestions float under the header, at most 6 (`slice(0, 6)`). | The user's request; the cap holds even if the backend returns more. |
| D-05 | The address comes from a picked suggestion or a picked map point; there is no typed address field. A map tap reverse-geocodes on the device (`expo-location` `reverseGeocodeAsync`); a failed or empty lookup saves the coordinates (`"-3.7319, -38.5267"`, 4 decimals) as the address. | The backend requires an address and saving must never get stuck; the device geocoder is free and needs no backend change. |
| D-06 | On Android, a tap on a labelled place (`onPoiClick`, Google Maps only) selects it through `useAddressPlace` with the screen's session token, like a suggestion. On iOS (Apple Maps reports no place taps) every tap is a point tap. | react-native-maps exposes place taps only on Google Maps. |
| D-07 | "My location" asks for the foreground permission only when tapped. Granted: the map centres on the device (`MAP_DELTA` span) and shows the user dot; the pin doesn't move. Denied: a toast, and nothing else changes. | An admin often plans a beach from somewhere else; asking at open is intrusive. |
| D-08 | The bottom panel is fixed (not draggable) and rises with the keyboard; with no point yet there is no pin and the card shows the empty hint. "Cancelar" and the back button both leave without saving. | Matches the design; the map takes the drags. |

## Expected Results

### ER-01 — Search and save on the full-screen location screen

- **Front:** mobile
- **Behavior:** Given an admin on "Nova aula" or "Editar aula", when they tap "+ Novo local" (or a row in "Gerir"
  mode), then the location screen opens with the map filling the screen, the default back button and a search field
  in the header ("Busque um endereço ou uma praia"), and a bottom panel titled "Novo local" (or "Editar local") with
  the address card, "Nome" and "Cancelar" / "Salvar local" ("Salvar" when editing). Typing 3+ characters shows at
  most 6 suggestions under the header; picking one closes the list, moves the pin and centres the map there, fills
  the card with the place's address over "<place name> · <lat>, <lng>", and fills "Nome" with the place's name when
  it is empty. "Salvar local" creates the location, goes back, and "Nova aula" / "Editar aula" shows it selected.
- **Edge and error cases:** 7+ suggestions from the API show 6; under 3 characters shows none; a repeated name
  shows "Já existe um local com este nome." and keeps the button off, as does an empty name or a missing point;
  editing opens with the location's name, address and pin, and offers the "Avisar alunos e instrutores das próximas
  aulas?" checkbox when upcoming classes use it and "Remover local", whose confirmation archives it, goes back and
  clears it from the form when it was selected; save errors behave as in spec 037 (duplicate from the server, "gone"
  toast and back); "Cancelar" and the back button go back without saving.
- **Verify by:** `npx jest src/modules/classes/screens/location-form.screen.test.tsx src/modules/classes/components/location-search-header src/modules/classes/screens/new-class.screen.test.tsx src/modules/classes/screens/edit-class.screen.test.tsx` (from `apps/mobile`) · iOS simulator journey: add a location by search from "Nova aula", see it selected; edit and remove one from "Editar aula".

### ER-02 — Pick a place on the map

- **Front:** mobile
- **Behavior:** Given the location screen, when the admin taps the map, then the pin moves to the tap and the card
  shows the device's reverse-geocoded address over "Ponto escolhido no mapa · <lat>, <lng>"; on Android, a tap on a
  labelled place selects it like a suggestion (address and point from Google, name into an empty "Nome").
- **Edge and error cases:** before any point the card shows "Toque no mapa para marcar o ponto" and no pin; a failed
  or empty lookup puts the coordinates (4 decimals) as the address; a failed place lookup on Android falls back to a
  point tap; a later tap replaces an earlier suggestion's address.
- **Verify by:** `npx jest src/modules/classes/hooks/use-map-place.hook.test.tsx src/modules/classes/components/location-address-card` (from `apps/mobile`) · iOS simulator journey: tap the map, save, see the address · Android emulator journey: tap a labelled beach, see its name and address.

### ER-03 — My location

- **Front:** mobile
- **Behavior:** Given the location screen, when the admin taps the "my location" button ("Minha localização"), then
  the app asks for the foreground location permission (only the first time) and, once granted, centres the map on the
  device's position and shows the user dot, without moving the pin.
- **Edge and error cases:** no permission is asked when the screen opens; denied shows the toast "Permita o acesso à
  localização nos Ajustes para usar sua posição." and the map, search and taps keep working; a failed position read
  shows the same toast.
- **Verify by:** `npx jest src/modules/classes/hooks/use-device-location.hook.test.tsx src/modules/classes/components/my-location-button` (from `apps/mobile`) · iOS simulator journey: tap the button, allow, see the map centred on the simulated location; deny on a fresh install, see the toast.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Install `expo-location` (`npx expo install expo-location`), add its config plugin to `app.json`
  with `locationWhenInUsePermission` ("Rocha's Surf School uses your location to centre the map when you add a
  class location."), and mock it in `jest.setup.ts` (`requestForegroundPermissionsAsync`,
  `getCurrentPositionAsync`, `reverseGeocodeAsync`). Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npx expo config --type public` lists the plugin and `npm test` passes.
  > ✅ 2026-10-26 — installed `expo-location` ~57.0.22 with `npx expo install`, added its config plugin to `app.json`
  > with the `locationWhenInUsePermission` text, and mocked it in `jest.setup.ts` (permission granted, a Fortaleza
  > position, no address by default); files: `apps/mobile/package.json`, `package-lock.json`, `apps/mobile/app.json`,
  > `apps/mobile/jest.setup.ts`; verified: `npx expo config --type public` lists `expo-location` with the text,
  > `npm test` (297 suites, 3193 tests passed); deviations: none
- [x] **T-02** — `src/modules/classes/components/location-search-header/` (component, hook, types, index): the
  header search field (search icon, clear button, `addressSearchPlaceholder`) and the floating suggestions list
  (bold match, place icon, at most 6, hidden under 3 characters or after a pick), with tests for the cap, the hiding
  and the pick. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes/components/location-search-header` passes.
  > ✅ 2026-10-26 — `LocationSearchHeader` sets the screen's `headerTitle` to the search field (search icon,
  > `locationSheet.addressSearchPlaceholder`, clear button, 44 px tall, width of the header beside the back button) and
  > renders the floating suggestions list under the header (`useHeaderHeight()` + 8): at most 6 rows
  > (`SUGGESTIONS_MAX`), the part of the title matching the text in `font-body-800`, a place icon; hidden under 3
  > characters, before the rows come, after a pick (the title stays in the field) or a clear. The hook owns the text and
  > the open state and asks `useAddressSuggestions` with the screen's session token; files:
  > `apps/mobile/src/modules/classes/components/location-search-header/index.ts`,
  > `apps/mobile/src/modules/classes/components/location-search-header/location-search-header.component.tsx`,
  > `apps/mobile/src/modules/classes/components/location-search-header/location-search-header.hook.ts`,
  > `apps/mobile/src/modules/classes/components/location-search-header/location-search-header.types.ts`,
  > `apps/mobile/src/modules/classes/components/location-search-header/location-search-header.component.test.tsx`;
  > verified: `npx jest src/modules/classes/components/location-search-header` (12 passed, 100% statements, branches,
  > functions and lines on the component and hook), `npx eslint` and `npx tsc --noEmit` clean; deviations: the list
  > renders in the screen body (not inside the native header view, which would clip it and not take its touches), so the
  > component sets the header's title through `<Stack.Screen options>` and draws the list itself; the existing
  > `locationSheet.addressSearchPlaceholder` string is reused
- [x] **T-03** — `src/modules/classes/hooks/use-map-place.hook.ts` (map tap → point + reverse geocode with the
  coordinates fallback; Android `onPoiClick` → `useAddressPlace`, falling back to a point tap) and
  `src/modules/classes/components/location-address-card/` (empty hint, map point, suggestion/place states), with
  tests for every case of ER-02. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-02 · Done when: `npx jest src/modules/classes/hooks/use-map-place.hook.test.tsx src/modules/classes/components/location-address-card` passes.
  > ✅ 2026-10-26 — `useMapPlace({ sessionToken, onSelect })`: `pressMap` reverse-geocodes the tap on the device
  > (`reverseGeocodeAsync`; Android's `formattedAddress`, else street and number – district – city/subregion – state, cut
  > to the address limit) and falls back to the coordinates (`formatPoint`, 4 decimals) on a failed or empty answer;
  > `pressPoi` (Android `onPoiClick`) looks the place up with `useAddressPlace` in the screen's session and falls back to a
  > point tap; `pickPlace` does the same for a suggestion and selects nothing when it fails. `pendingPoint` moves the pin at
  > once while an address is looked up, and an answer a newer tap replaced is dropped. `LocationAddressCard` shows the
  > empty hint, then the address over "<place name> · <lat>, <lng>" or "Ponto escolhido no mapa · …", and "Buscando o
  > endereço…" while a lookup runs. Added `MapPlace`, `MapPressEvent`, `PoiClickEvent` to `classes.types.ts`,
  > `formatPoint` to `utils/map.ts`, and the card's strings (`locationSheet.pointPicked`, `locationSheet.resolving`) in
  > the three languages; files: `apps/mobile/src/modules/classes/hooks/use-map-place.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-map-place.hook.test.tsx`,
  > `apps/mobile/src/modules/classes/components/location-address-card/index.ts`,
  > `apps/mobile/src/modules/classes/components/location-address-card/location-address-card.component.tsx`,
  > `apps/mobile/src/modules/classes/components/location-address-card/location-address-card.types.ts`,
  > `apps/mobile/src/modules/classes/components/location-address-card/location-address-card.component.test.tsx`,
  > `apps/mobile/src/modules/classes/classes.types.ts`, `apps/mobile/src/modules/classes/utils/map.ts`,
  > `apps/mobile/src/modules/classes/utils/map.test.ts`, `apps/mobile/src/i18n/messages/en-US.ts`,
  > `apps/mobile/src/i18n/messages/es-ES.ts`, `apps/mobile/src/i18n/messages/pt-BR.ts`; verified:
  > `npx jest src/modules/classes/hooks/use-map-place.hook.test.tsx src/modules/classes/components/location-address-card src/modules/classes/utils/map.test.ts`
  > (28 passed, 100% on the hook, the card and `map.ts`), `npx eslint`, `npx tsc --noEmit`, `npx jest src/i18n` clean;
  > deviations: the card's two strings are added here rather than in T-05, since the card needs them; a "looking up the
  > address" state (not in the spec) keeps the card honest while the device or Google answers. Note: a single mutation
  > hook test file run alone leaves Jest open (React Query's mutation GC timer) — true of the existing
  > `use-address-place.hook.test.tsx` too; multi-file runs exit normally
- [x] **T-04** — `src/modules/classes/hooks/use-device-location.hook.ts` (permission on demand, position, toast on
  denial or failure) and `src/modules/classes/components/my-location-button/` (the round map button, 44 px, tokens
  only), with tests for granted, denied and failed. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03 · Done when: `npx jest src/modules/classes/hooks/use-device-location.hook.test.tsx src/modules/classes/components/my-location-button` passes.
  > ✅ 2026-10-26 — `useDeviceLocation()` returns `locate()` (asks the foreground permission only when called, then
  > reads the position with `Accuracy.Balanced`) and `granted` (true once allowed, for the user dot); a denial or any
  > failure shows the toast `locationSheet.locationDenied` ("Permita o acesso à localização nos Ajustes para usar sua
  > posição.") and gives `null`. `MyLocationButton`: a round 44 pt `TouchableOpacity` (`h-11 w-11 rounded-full`,
  > `bg-surface`, `border-line`, `shadowStyle("iconButton")`, the `locate` icon in `lagoon`) named
  > `locationSheet.myLocation` ("Minha localização"). Strings added in the three languages; files:
  > `apps/mobile/src/modules/classes/hooks/use-device-location.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-device-location.hook.test.tsx`,
  > `apps/mobile/src/modules/classes/components/my-location-button/index.ts`,
  > `apps/mobile/src/modules/classes/components/my-location-button/my-location-button.component.tsx`,
  > `apps/mobile/src/modules/classes/components/my-location-button/my-location-button.types.ts`,
  > `apps/mobile/src/modules/classes/components/my-location-button/my-location-button.component.test.tsx`,
  > `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`,
  > `apps/mobile/src/i18n/messages/pt-BR.ts`; verified:
  > `npx jest src/modules/classes/hooks/use-device-location.hook.test.tsx src/modules/classes/components/my-location-button`
  > (8 passed: granted, denied, failed read, nothing asked before the tap; 100% on both files), `npx eslint`,
  > `npx tsc --noEmit` clean; deviations: the two strings are added here rather than in T-05
- [x] **T-05** — `src/modules/classes/utils/location-events.ts` (D-03) and the screen
  `src/modules/classes/screens/location-form.screen.tsx` with its hook (the form rules moved from
  `location-sheet.hook.ts`), route `src/app/(private)/admin/location-form.tsx` and `routes.admin.locationForm(id?)`
  in `src/constants/routes.ts`: full-screen map with the pin and user dot, `LocationSearchHeader` as `headerTitle`
  on the transparent header, `MyLocationButton`, the fixed bottom panel (title, address card, "Nome", notify
  checkbox, "Cancelar" / "Salvar local", "Remover local" + `ArchiveLocationSheet`) rising with the keyboard; new
  strings in `en-US`, `es-ES` and `pt-BR`. Tests in `location-form.screen.test.tsx` and `location-events.test.ts`
  for create, edit, remove, duplicate, save errors, unknown `id` and the events. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/classes/screens/location-form.screen.test.tsx src/modules/classes/utils/location-events.test.ts` passes.
  > ✅ 2026-10-26 — `utils/location-events.ts` (`subscribeLocationEvents({ onCreated, onRemoved })` returns the
  > unsubscribe; `emitLocationCreated`, `emitLocationRemoved`). `LocationFormScreen` + `useLocationFormScreen`: the
  > route `src/app/(private)/admin/location-form.tsx` and `routes.admin.locationForm(id?)`; the screen sets a transparent
  > header on every platform, draws `MapView` across the whole screen (controlled `region`, `mapPadding` clear of the
  > header and the measured panel, `showsUserLocation` once allowed, `onPoiClick` only on Android) with the pin
  > (`pendingPoint` while an address is looked up, else the picked place), `LocationSearchHeader`, `MyLocationButton`
  > (centres on the device with `MAP_DELTA`, pin unchanged) and the fixed bottom panel riding the keyboard
  > (`usePinnedFooter`): title, `LocationAddressCard`, "Nome", the notify checkbox with its count, "Cancelar" / "Salvar
  > local" ("Salvar" when editing), "Remover local" + `ArchiveLocationSheet`. The hook keeps the sheet's rules: the
  > location and the duplicate list from `useLocations()`, the form filled once the location is known, an empty "Nome"
  > filled by a picked place's name, duplicate by name (own name allowed) or from the server (409, list reloaded),
  > gone (409 `location.archived` / 404) → toast, list reloaded, back, `emitLocationRemoved`; other errors → toast and
  > stay; session expired → nothing; save → `emitLocationCreated` or "Local atualizado", then back; removal → toast,
  > back, `emitLocationRemoved`; an `id` not among the active locations (or a failed list) → "gone" toast and back,
  > once. Save stays off while an address is looked up; files:
  > `apps/mobile/src/modules/classes/utils/location-events.ts`,
  > `apps/mobile/src/modules/classes/utils/location-events.test.ts`,
  > `apps/mobile/src/modules/classes/screens/location-form.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/location-form.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/location-form.screen.types.ts`,
  > `apps/mobile/src/modules/classes/screens/location-form.screen.test.tsx`,
  > `apps/mobile/src/app/(private)/admin/location-form.tsx`, `apps/mobile/src/constants/routes.ts`; verified:
  > `npx jest src/modules/classes/screens/location-form.screen.test.tsx src/modules/classes/utils/location-events.test.ts`
  > (39 passed; 100% statements, branches, functions and lines on the screen, its hook and the events), `npx eslint`,
  > `npx tsc --noEmit` clean; deviations: the screen's strings were added in T-03/T-04 (no new ones were needed here:
  > the rest reuse `locationSheet.*`); the pinned-footer hook is reused from `modules/school-settings` as
  > `send-notice.screen.tsx` does; `routes.admin.locationForm` is exercised by the class form tests of T-06
- [x] **T-06** — Point "Nova aula" and "Editar aula" at the route (`new-class.screen.hook.ts`,
  `edit-class.screen.hook.ts` and their screens): "+ Novo local" and a "Gerir" row push
  `routes.admin.locationForm()`, the screens subscribe to the location events to select or clear; reduce
  `use-location-management.hook.ts` to the "Gerir" mode; delete `components/location-sheet/`,
  `components/location-map-picker/`, `components/address-search-field/` and their tests and the unused
  `locationSheet` strings. Update the screens' tests. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes` passes and `grep -rn "LocationSheet\b" src` finds nothing.
  > ✅ 2026-10-26 — "Nova aula" and "Editar aula": "+ Novo local" pushes `routes.admin.locationForm()` and a "Gerir" row
  > `routes.admin.locationForm(id)`; both hooks subscribe to the location events while mounted (`useEffectEvent` +
  > `subscribeLocationEvents`) to select a created location or clear a removed selected one. `useLocationManagement`
  > keeps only the "Gerir" mode. Deleted `components/location-sheet/`, `components/location-map-picker/`,
  > `components/address-search-field/` (with their tests) and the unused `locationSheet` strings (`description`,
  > `address`, `addressPlaceholder`, `editDescription`, `point`, `pointHintSet`) in the three languages; the screens'
  > tests now cover the push with and without an id, the selection on a created location, the clearing on a removed one,
  > the kept selection when another is removed, and the unsubscription; files:
  > `apps/mobile/src/modules/classes/screens/new-class.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/new-class.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/new-class.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/screens/edit-class.screen.tsx`,
  > `apps/mobile/src/modules/classes/screens/edit-class.screen.hook.ts`,
  > `apps/mobile/src/modules/classes/screens/edit-class.screen.test.tsx`,
  > `apps/mobile/src/modules/classes/hooks/use-location-management.hook.ts`,
  > `apps/mobile/src/modules/classes/hooks/use-location-management.hook.test.tsx`,
  > `apps/mobile/src/i18n/messages/en-US.ts`, `apps/mobile/src/i18n/messages/es-ES.ts`,
  > `apps/mobile/src/i18n/messages/pt-BR.ts`; deleted:
  > `apps/mobile/src/modules/classes/components/location-sheet/` (`index.ts`, `location-sheet.component.tsx`,
  > `location-sheet.hook.ts`, `location-sheet.types.ts`, `location-sheet.component.test.tsx`),
  > `apps/mobile/src/modules/classes/components/location-map-picker/` (`index.ts`, `location-map-picker.component.tsx`,
  > `location-map-picker.hook.ts`, `location-map-picker.types.ts`, `location-map-picker.component.test.tsx`),
  > `apps/mobile/src/modules/classes/components/address-search-field/` (`index.ts`,
  > `address-search-field.component.tsx`, `address-search-field.types.ts`, `address-search-field.component.test.tsx`);
  > verified: `npx jest src/modules/classes` (86 suites, 1047 tests passed), `npx eslint`, `npx tsc --noEmit` clean,
  > `grep -rn "\bLocationSheet\b" src` finds nothing; deviations: the literal `grep -rn "LocationSheet\b" src` of the
  > task also matches `ArchiveLocationSheet`, which D-01 keeps, so the check was run with a word boundary on both sides;
  > `activeLocations` (only the sheet used it) left the edit hook's return. Note: five existing new-class tests log
  > React Query act() warnings, on the base commit too

### Verification

- [ ] **T-07** — Run every command in the Verification Plan from the repo root; all pass. Then run the user
  journeys of ER-01 to ER-03 in the iOS simulator (after `npx expo prebuild --platform ios` for the new plugin) and
  the labelled-place tap of ER-02 in the Android emulator. Record the output summary and the journeys as evidence.
  Covers: all · Done when: every command exits 0 and every journey behaves as its Expected Result says.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 065` — the related tests pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 065` — every line this spec adds or changes is covered.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- Manual (mobile has no end-to-end suite): the iOS simulator journeys of ER-01, ER-02 and ER-03, and the Android
  emulator journey of ER-02's labelled-place tap.

## Memory Impact

- `memory/modules/classes.md` — the location sheet becomes the full-screen location screen: header search (at most
  6 suggestions), map picking with device reverse geocoding (Android place taps), "my location", and the events that
  select or clear the location on the class form.
- `memory/structure.md` — the admin route `location-form` (`?id=` for edit) and the new components and hooks in
  `modules/classes`.
- `memory/technical-context.md` — `expo-location` and its "when in use" permission (asked on demand), and that
  place taps exist only on Google Maps (Android).

## Amendments

## Review
