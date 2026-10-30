---
id: "080"
slug: staging-mobile
title: Staging builds of the mobile app on real phones
status: in-progress
created: 2026-10-30
started: 2026-10-30
base_commit: 701fa8106334bf8576c7345d240357a86f0a34dd
fronts: [mobile]
depends_on: ["079"]
---

# 080 — Staging builds of the mobile app on real phones

## Goal

Get the real app onto real iPhones and Android phones, talking to the staging API from spec 079. Android builds
install from an EAS link and iOS builds through TestFlight, so the things a simulator can't prove can finally be
tested: push notifications, Google sign-in on Android and the Android map. It ends with an admin and a student
completing a seat request on two real phones.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: every role uses the mobile app, on iOS and
  Android.
- Requirements: [requirements.md → Push delivery](../../../.docs/requirements.md#push-delivery) — notifications arrive
  as pushes on the user's phone; [requirements.md → Sign-in methods](../../../.docs/requirements.md#sign-in-methods) —
  including Google; [requirements.md → Saved locations](../../../.docs/requirements.md#saved-locations) — class
  locations on a map.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Applications
  (`apps/mobile`), Push notifications, Google sign-in, Maps and address suggestions, Automated validation.
- Existing code this builds on:
  - `apps/mobile/app.json` — identity `com.rochassurfschool.app` on both platforms; no EAS `projectId` yet.
  - `apps/mobile/app.config.ts` — adds the `react-native-maps` plugin with `GOOGLE_MAPS_ANDROID_API_KEY`;
    `app.config.test.ts` tests it.
  - `apps/mobile/.env.example` — the `EXPO_PUBLIC_*` values. `.env` is gitignored, so EAS doesn't read it.
  - Metro reads the workspace packages' built `dist/`, which is gitignored, so EAS must build them itself.
  - There is no `eas.json`, and `expo-updates` isn't installed.
- Depends on: spec `079`, for `https://api-staging.rochassurfschool.com` and the test accounts.

## Scope

### In scope

- `eas.json` with one internal Android profile and one TestFlight iOS profile.
- Building the workspace packages during EAS builds.
- Firebase configuration for Android push.
- The EAS project, its `preview` environment variables and the credentials.
- Android and iOS builds checked on real phones.

### Out of scope

- Store releases: Google Play listings, App Store review and public TestFlight.
- EAS Update (over-the-air updates).
- Apple sign-in work beyond what already exists.
- Running the 12 test sets' journeys, which are a test activity rather than a spec.
- Any change to app screens, unless a phone check finds a bug, which then gets its own spec.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | One identity, `com.rochassurfschool.app`, with no separate staging app. | Nothing else uses that identity yet, and a second one would double the Firebase, Apple and Google setup. |
| D-02 | Android uses EAS internal distribution (`preview` profile, APK), with no Google Play account. | Anyone with the link can install it, and it needs no store review. |
| D-03 | iOS uses TestFlight, with the user as the first internal tester, through a `testflight` profile with store signing. | Ad hoc builds need every phone's UDID registered; TestFlight doesn't. |
| D-04 | The Apple Developer account is the user's personal enrolment. | The user's choice. The store shows the user's name as the seller. |
| D-05 | Android comes first, and iOS follows in this same spec when the Apple account is active. | Enrolment can take days, and Android has no such wait. Spec 080 stays open until both are proven. |
| D-06 | `EXPO_PUBLIC_API_URL` is `https://api-staging.rochassurfschool.com`, and `EXPO_PUBLIC_WEB_URL` is the Vercel production URL of the `rochas-surf-school` project, as `preview` variables in EAS. | `.env` isn't read by EAS, and the website stays on Vercel (spec 079). |
| D-07 | The `google-services.json` file is an EAS file variable, `GOOGLE_SERVICES_JSON`, and `app.config.ts` only sets `android.googleServicesFile` when that variable exists. | The file stays out of the repo, and local development keeps working without it. |
| D-08 | The workspace packages build in an `eas-build-post-install` script in `apps/mobile/package.json`, through Turbo. | EAS runs it automatically after installing, and Turbo already knows the build order. |
| D-09 | The repo stays free of store credentials: the keystore, APNs key and FCM service account live in EAS. | The repo is public. |

## Expected Results

### ER-01 — The Android build installs and reaches staging

- **Front:** mobile
- **Behavior:** Given the `preview` build's EAS link, when it's installed on a real Android phone and a test account
  signs in with its fixed code, then the home screen of that account's role opens with data from staging.
- **Edge and error cases:** with the phone offline, the app shows its existing error state, not a crash.
- **Verify by:** install the build on the phone, sign in, and confirm the account's classes match the staging data.

### ER-02 — Push reaches a closed Android app

- **Front:** mobile
- **Behavior:** Given a signed-in Android phone that allows notifications and has the app closed, when the backend
  notifies that user, then the push arrives, and tapping it opens the screen that notification's row opens in the
  Notifications screen.
- **Edge and error cases:** with the app's Push setting off, no push arrives, and the notification still appears in
  the Notifications screen.
- **Verify by:** close the app, have an admin take an action that notifies this user, then tap the push.

### ER-03 — Google sign-in works on Android

- **Front:** mobile
- **Behavior:** Given the build signed with EAS's keystore, when a person taps the Google button and picks an account,
  then the app signs them in.
- **Edge and error cases:** cancelling Google's picker returns to the sign-in screen with no error.
- **Verify by:** sign in with a real Google account on the Android phone; a new account lands in the registration
  flow that the requirements describe.

### ER-04 — The location map draws on Android

- **Front:** mobile
- **Behavior:** Given a class with a location, when its details are opened on Android, then the map draws its tiles
  and the marker.
- **Edge and error cases:** an admin saving a location gets address suggestions through the staging API.
- **Verify by:** open a class's location on the phone and confirm the map isn't blank.

### ER-05 — The iOS build works from TestFlight

- **Front:** mobile
- **Behavior:** Given the build in TestFlight, when it's installed on a real iPhone and a test account signs in, then
  the home screen opens and the phone receives a push with the app closed.
- **Edge and error cases:** Google sign-in works on this build too.
- **Verify by:** install through TestFlight, sign in, close the app, and trigger a notification.

### ER-06 — An admin and a student complete a seat request on two phones

- **Front:** mobile
- **Behavior:** Given an admin on one real phone and a student on another, when the admin creates a class, the student
  requests a seat and the admin approves it, then the student's phone receives the push and the class shows the seat
  as approved.
- **Edge and error cases:** the admin's phone receives the push about the request while the app is closed.
- **Verify by:** run the journey with two test accounts, one on Android and one on iPhone.

## Tasks

### Mobile (`apps/mobile`)

- [x] **T-01** — Add `eas.json` with the `preview` and `testflight` profiles (`appVersionSource: remote`, Node 24) and
  the `eas-build-post-install` script of D-08 in `package.json`. Skill:
  [`vercel-react-native-skills`](../../../.claude/skills/vercel-react-native-skills).
  Covers: enabling · Done when: `eas.json` parses, and with the workspaces' `dist` folders deleted,
  `npm run eas-build-post-install --workspace @rochas-surf-school/mobile` recreates them.
  > ✅ 2026-10-30 20:50 — `eas.json` has `preview` (internal APK) and `testflight` (store, `autoIncrement`), both in the
  > EAS `preview` environment on Node 24.22.2, whose npm 11.19.1 satisfies the root `devEngines`; the hook is
  > `turbo run build --filter=@rochas-surf-school/mobile^...`, which builds only the mobile app's five dependencies;
  > files: `apps/mobile/eas.json`, `apps/mobile/package.json`; verified: `eas.json` parses; with every `packages/*/dist`
  > and `modules/*/dist` deleted the hook recreated `app-messages`, `auth`, `classes` and `shared`, and with
  > `TURBO_FORCE=true` it rebuilt all five with 0 cached, as EAS's empty cache will; deviations: the skill has no rule
  > for EAS configuration, so the file follows Expo's `eas.json` docs. `eas config` can't validate the file until
  > T-03 links the project.

- [x] **T-02** — Set `android.googleServicesFile` from `GOOGLE_SERVICES_JSON` in `app.config.ts` as in D-07, add
  `google-services.json` to the ignores, document the variable in `.env.example`, and add both cases to
  `app.config.test.ts`.
  Covers: enabling · Done when: `npx jest app.config` passes from `apps/mobile`.
  > ✅ 2026-10-30 20:58 — `app.config.ts` sets `android.googleServicesFile`, keeping the rest of `android`, only when
  > the variable has a value; files: `apps/mobile/app.config.ts`, `apps/mobile/app.config.test.ts`,
  > `apps/mobile/.gitignore`, `apps/mobile/.env.example`; verified: the new test failed first on the missing value, then
  > `npx jest app.config` passed (6 tests, `app.config.ts` 100% statements, branches, functions and lines); `tsc --noEmit`
  > exits 0; `GOOGLE_SERVICES_JSON=/tmp/x.json npx expo config --json` shows the path with `android.package` kept;
  > `git check-ignore` matches `google-services.json`; deviations: none.

- [ ] **T-03** — With the user's Expo and Firebase accounts: run `eas init`, commit the `projectId` it writes to
  `app.json`, set the `preview` variables, upload the FCM V1 key, and add the keystore's SHA-1 to Google Cloud's Android
  client. This task stays blocked with ⛔ until the user provides the accounts and spec 079's API answers.
  Covers: enabling · Done when: `npx eas-cli env:list --environment preview` lists every variable and
  `npx eas-cli credentials` shows the FCM key.

- [ ] **T-04** — Build the `preview` profile for Android and check it on a real phone.
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: the build finishes and the Verify by of ER-01 to ER-04 pass on the
  phone.

- [ ] **T-05** — With the user's Apple Developer account: upload the APNs key, build the `testflight` profile, submit
  it with `eas submit`, and add the user as an internal tester. This task stays blocked with ⛔ until the Apple
  enrolment is active.
  Covers: ER-05, ER-06 · Done when: the Verify by of ER-05 and ER-06 pass on real phones.

### Verification

- [ ] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary as
  evidence.
  Covers: all · Done when: every automated command exits 0 and each phone check is recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 080` — the tests this spec adds or changes, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 080` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 080` — no e2e suite is declared for mobile, so this reports nothing to run.
  - `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` — no errors.
- User journeys (followed on real phones, because a simulator can't prove push):
  - ER-01 to ER-04 on an Android phone.
  - ER-05 on an iPhone.
  - ER-06 on one phone of each.

## Memory Impact

- `memory/technical-context.md` — Deployment: EAS profiles, internal Android distribution, TestFlight and where
  credentials live; Applications (`apps/mobile`): `eas.json`, the post-install build and `GOOGLE_SERVICES_JSON`; Push
  notifications: FCM V1 and APNs are configured.
- `memory/product.md` — staging builds exist for both platforms.

## Assumptions

- Spec 079's API is live before T-03. If a phone check finds an API bug, it's fixed in a spec of its own.
- The user's personal Apple enrolment is approved in time. Until then, T-05 stays blocked and the spec stays open.
- The user has a real Android phone and a real iPhone for the checks.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)

## Amendments

## Review
