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

- [ ] **T-01** — Install `expo-location` (`npx expo install expo-location`), add its config plugin to `app.json`
  with `locationWhenInUsePermission` ("Rocha's Surf School uses your location to centre the map when you add a
  class location."), and mock it in `jest.setup.ts` (`requestForegroundPermissionsAsync`,
  `getCurrentPositionAsync`, `reverseGeocodeAsync`). Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `npx expo config --type public` lists the plugin and `npm test` passes.
- [ ] **T-02** — `src/modules/classes/components/location-search-header/` (component, hook, types, index): the
  header search field (search icon, clear button, `addressSearchPlaceholder`) and the floating suggestions list
  (bold match, place icon, at most 6, hidden under 3 characters or after a pick), with tests for the cap, the hiding
  and the pick. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes/components/location-search-header` passes.
- [ ] **T-03** — `src/modules/classes/hooks/use-map-place.hook.ts` (map tap → point + reverse geocode with the
  coordinates fallback; Android `onPoiClick` → `useAddressPlace`, falling back to a point tap) and
  `src/modules/classes/components/location-address-card/` (empty hint, map point, suggestion/place states), with
  tests for every case of ER-02. Skill: [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-02 · Done when: `npx jest src/modules/classes/hooks/use-map-place.hook.test.tsx src/modules/classes/components/location-address-card` passes.
- [ ] **T-04** — `src/modules/classes/hooks/use-device-location.hook.ts` (permission on demand, position, toast on
  denial or failure) and `src/modules/classes/components/my-location-button/` (the round map button, 44 px, tokens
  only), with tests for granted, denied and failed. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-03 · Done when: `npx jest src/modules/classes/hooks/use-device-location.hook.test.tsx src/modules/classes/components/my-location-button` passes.
- [ ] **T-05** — `src/modules/classes/utils/location-events.ts` (D-03) and the screen
  `src/modules/classes/screens/location-form.screen.tsx` with its hook (the form rules moved from
  `location-sheet.hook.ts`), route `src/app/(private)/admin/location-form.tsx` and `routes.admin.locationForm(id?)`
  in `src/constants/routes.ts`: full-screen map with the pin and user dot, `LocationSearchHeader` as `headerTitle`
  on the transparent header, `MyLocationButton`, the fixed bottom panel (title, address card, "Nome", notify
  checkbox, "Cancelar" / "Salvar local", "Remover local" + `ArchiveLocationSheet`) rising with the keyboard; new
  strings in `en-US`, `es-ES` and `pt-BR`. Tests in `location-form.screen.test.tsx` and `location-events.test.ts`
  for create, edit, remove, duplicate, save errors, unknown `id` and the events. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01, ER-02, ER-03 · Done when: `npx jest src/modules/classes/screens/location-form.screen.test.tsx src/modules/classes/utils/location-events.test.ts` passes.
- [ ] **T-06** — Point "Nova aula" and "Editar aula" at the route (`new-class.screen.hook.ts`,
  `edit-class.screen.hook.ts` and their screens): "+ Novo local" and a "Gerir" row push
  `routes.admin.locationForm()`, the screens subscribe to the location events to select or clear; reduce
  `use-location-management.hook.ts` to the "Gerir" mode; delete `components/location-sheet/`,
  `components/location-map-picker/`, `components/address-search-field/` and their tests and the unused
  `locationSheet` strings. Update the screens' tests. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: ER-01 · Done when: `npx jest src/modules/classes` passes and `grep -rn "LocationSheet\b" src` finds nothing.

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
