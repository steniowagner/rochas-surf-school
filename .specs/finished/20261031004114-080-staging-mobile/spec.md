---
id: "080"
slug: staging-mobile
title: Staging builds of the mobile app on real phones
status: finished
created: 2026-10-30
started: 2026-10-30
base_commit: 701fa8106334bf8576c7345d240357a86f0a34dd
reviewed_commit: 095380c882b89484dc2988d8eaeb92dce882bb6f
fronts: [mobile]
depends_on: ["079"]
finished: 2026-10-31
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

- [x] **T-03** — With the user's Expo and Firebase accounts: run `eas init`, commit the `projectId` it writes to
  `app.json`, set the `preview` variables, upload the FCM V1 key, and add the keystore's SHA-1 to Google Cloud's Android
  client. This task stays blocked with ⛔ until the user provides the accounts and spec 079's API answers.
  Covers: enabling · Done when: `npx eas-cli env:list --environment preview` lists every variable and
  `npx eas-cli credentials` shows the FCM key.
  > ✅ 2026-10-30 22:30 — `eas init --account rochas-surf-school` linked project
  > `0a5ce95a-6191-4a27-b81e-6d5a516564ac` (the user chose the organization); the `preview` variables are
  > `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`,
  > `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_MAPS_ANDROID_API_KEY` and the secret file `GOOGLE_SERVICES_JSON`; the
  > user entered the last two, uploaded the FCM V1 key for Firebase project `rochas-surf-school-35797` and created the
  > EAS keystore; files: `apps/mobile/app.json`; verified: `npx eas-cli env:list --environment preview` lists all six,
  > and the user's `eas credentials` screen shows the FCM V1 key and the default keystore; deviations: the keystore's
  > SHA-1 went into a new Android OAuth client, `Android EAS staging`, because one client holds one SHA-1 and the
  > existing one keeps debug builds working; it was also added next to the debug SHA-1 on the Maps key, whose restriction
  > would otherwise block this build. ER-03 and ER-04 prove both on the phone.

- [x] **T-04** — Build the `preview` profile for Android and check it on a real phone.
  Covers: ER-01, ER-02, ER-03, ER-04 · Done when: the build finishes and the Verify by of ER-01 to ER-04 pass on the
  phone.
  > ✅ 2026-10-31 00:18 — build `048642b9-eec6-4db6-8192-1d8994de4493` (commit `12edb576`, `versionCode` 1) finished on
  > EAS with its APK. The user reports the app and a new Google account working on the phone, and an approval from an
  > iPhone admin reached staging, but ER-02 failed: no push arrived. Staging has the `registration.approved` row from
  > 01:43:51 UTC, but that student has no row in `push_tokens` and there are no `push_tickets`, so the backend had no
  > device to send to. The only token is the iOS admin's. The build log shows `GOOGLE_SERVICES_JSON` and
  > `processReleaseGoogleServices`, so the Firebase file was in the build. The user then found notifications disabled on
  > the phone, which explains the missing token: this was the phone's setting, not a bug. Rerun with them allowed: a new
  > Google account registered the Android token at 01:53:49 UTC, and the user reports the `registration.pending` push on
  > the iPhone and the `registration.approved` push on Android; staging holds two tickets from those sends. The user
  > then reports ER-01 (staging's classes, offline), ER-02 (closed app, its tap, Push off), ER-03 (cancelled picker) and
  > ER-04 (map, address suggestions) passing, with one exception that keeps this task open: a class message sent at
  > 02:51:42 UTC, while the class was in progress, never arrived as a push. Staging stored its rows for the student and
  > two instructors. Neither instructor has a device, so the student's Android phone was the only possible target, and
  > that row was marked read at 02:51:56. The ticket can't settle it, because the receipt job deletes tickets after 15
  > minutes, and the sending code has no branch on a class being in progress: `SendClassMessage` only refuses cancelled
  > and finished classes, and the real push text renders in the three languages. Nothing shows whether Push was on at
  > 02:51. The user chose not to rerun it, accepted the spec's checks as working, and will take this into a new spec
  > with their other findings, so this one case stays unconfirmed, not proven; files: `apps/mobile/eas.json`,
  > `apps/mobile/app.config.ts`; verified: the user's reports above, plus the staging rows and tickets quoted; deviations:
  > the class message's rerun was skipped by the user's decision.

- [x] **T-05** — With the user's Apple Developer account: upload the APNs key, build the `testflight` profile, submit
  it with `eas submit`, and add the user as an internal tester. This task stays blocked with ⛔ until the Apple
  enrolment is active.
  Covers: ER-05, ER-06 · Done when: the Verify by of ER-05 and ER-06 pass on real phones.
  > ✅ 2026-10-31 00:16 — the user ran the first `testflight` build with their Apple sign-in, generating the distribution
  > certificate, the provisioning profile and the APNs key: build `22569aa7-9205-4e75-9190-58a26e86935c` (commit
  > `f3ade8cd`, build number 1) finished with its `.ipa`, `eas submit` finished, and the user installed it through
  > TestFlight; files: `apps/mobile/app.json`, `apps/mobile/eas.json`; verified: the user reports ER-05 (home, closed-app
  > push, Google sign-in on this build) and ER-06 (admin and student on two phones) passing. Staging shows the journey on
  > class `89218aff-1ea7-402b-a65f-75003a09109f`: `enrolment.requested` at 02:53:43 UTC, `enrolment.approved` at 02:53:56
  > and the seat approved. The later `registration.approved` push to the iPhone's student left a ticket at 03:10:32;
  > deviations: `ios.config.usesNonExemptEncryption: false`, as Expo documents for an app whose only encryption is the
  > OS's HTTPS and `expo-secure-store`, so builds don't stop on Missing Compliance; `appName` in the `testflight` submit
  > profile, because App Store names are unique and the default, `RSS`, is the short one under the icon; the App Store
  > Connect API key on EAS has the `APP_MANAGER` role, not the default `ADMIN`.

### Verification

- [x] **T-06** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary as
  evidence.
  Covers: all · Done when: every automated command exits 0 and each phone check is recorded.
  > ✅ 2026-10-31 00:19 — files: none; verified: `run-related-tests.mjs 080` exits 0 (1 suite, 6 tests);
  > `check-coverage.mjs 080` exits 0 with no changed line to measure, because `app.config.ts` counts as tool config (the
  > last run measured it at 100% in T-02); `run-e2e.mjs 080` exits 0 with no suite for the changed workspaces;
  > `npx turbo run lint check-types --filter=@rochas-surf-school/mobile` exits 0 (9 tasks, all cached). The phone checks
  > are recorded under T-04 and T-05; deviations: the class message under T-04 stays unconfirmed by the user's decision.

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

### Round 1 — 2026-10-31 — accepted

**Checks**

- lint ✅ · type check ✅ (apps/mobile, 9 tasks, cached); apps/mobile has no build script
- related tests ✅ 6 passed (`app.config.test.ts`)
- coverage of the changed lines ✅ `COVERAGE OK`: no changed line to measure, because all three changed source files
  count as tests or tool config, which are always excluded. The two `GOOGLE_SERVICES_JSON` tests assert both branches
  of `app.config.ts`, and would fail without the code
- e2e ✅ `E2E PASSED`: no suite applies; no e2e suite exists for mobile
- `eas.json` parses; `eas-build-post-install` with `TURBO_FORCE=true`: 5 tasks, 0 cached, exit 0, and its filter selects
  the mobile app's five workspace dependencies
- `eas env:list --environment preview` lists the six variables; `EXPO_PUBLIC_API_URL` is the staging address, and
  `EXPO_PUBLIC_WEB_URL` the Vercel production URL, which answers 200. `GET /health` on staging answers 200
- `eas build:view`: Android `048642b9…` is finished, `preview`, internal, APK, at `12edb576`; iOS `22569aa7…` is finished,
  `testflight`, store, at `f3ade8cd`. No workspace code changed after `f3ade8cd`, and the only changes after `12edb576`
  are the iOS encryption flag and the submit profile, so the Android build still stands for this commit

**Expected Results**

The phone checks ran on the user's real phones, and neither this session nor a simulator can repeat them, so each one
below is judged from the evidence under T-04 and T-05, compared with staging's rows, the EAS builds and the code.

- ER-01 ✅ — the user's report under T-04 (staging's classes, offline). The build's API variable is staging's
- ER-02 ✅ with a recorded deviation — the Verify by passed: staging has `registration.approved` at 01:54:04 UTC, read at
  01:54:13, and the user reports the closed-app push, its tap and Push off. One class message, at 02:51:42 UTC, is
  reported as never arriving as a push and stays unconfirmed by the user's decision. Staging holds its three rows, with
  the student's read at 02:51:56. The code agrees with T-04: `SendClassMessage` refuses only cancelled and finished
  classes, the notifier has no branch on the class's state, and `PushReceiptCheckJob` drops tickets at 15 minutes, so
  neither delivery nor failure can be proven. This is a recorded gap, not a proven failure, in a case the Verify by
  doesn't require
- ER-03 ✅ — the user's report under T-04 (Google account, cancelled picker). `registration.pending` at 01:53:48 UTC
  shows a new account entering the registration flow
- ER-04 ✅ — the user's report under T-04 (map, address suggestions)
- ER-05 ✅ — the user's report under T-05. Staging's `registration.approved` at 03:10:32 UTC, read at 03:10:38, and its
  ticket from the same second are there
- ER-06 ✅ — the user's report under T-05. On class `89218aff-1ea7-402b-a65f-75003a09109f` the enrolment is `approved`,
  requested at 02:53:43 and decided at 02:53:55 UTC; `enrolment.requested` was read at 02:53:52 and
  `enrolment.approved` at 02:54:01

**Findings**

None.

**Notes**

- For the new spec on the class message: a second `class.message` reached the same student at 02:54:27 UTC, on a class
  that hadn't started, and that row is unread. T-04 doesn't mention it, and it proves nothing alone, because a push
  that arrives and isn't tapped looks the same. Its ticket is gone too. A rerun within 15 minutes of the send can read
  the receipt.
- Memory for `spec-finish`: `technical-context.md`'s Push section still says the keys are "not set up yet". `## Memory
  Impact` leaves out T-03's deviations, which belong in it: the second Android OAuth client, `Android EAS staging`, and
  the keystore's SHA-1 on the Maps key.
- All six tasks and every Decision hold, nothing in Out of scope was built, and no secret, Firebase file or real
  person's email is in the change.
