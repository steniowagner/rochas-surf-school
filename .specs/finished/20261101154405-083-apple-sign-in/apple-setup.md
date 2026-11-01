# Apple setup for spec 083

Everything you do at Apple for Sign in with Apple, written for someone who has never used the Apple Developer portal.
It takes about 10 minutes. You do every step in your own account: nobody needs your Apple password, and nothing here
goes into the repo or a chat.

## What this spec needs

| Item | What you do | Where it lives |
| --- | --- | --- |
| Sign In with Apple capability on the App ID `com.rochassurfschool.app` | Turn it on once (steps 1–4) | Apple Developer portal |
| Distribution certificate | Nothing | Already on EAS (spec 080) |
| Provisioning profile | Nothing by hand. Changing the App ID invalidates the current one, so EAS has to regenerate it at the next build | EAS |
| `APPLE_CLIENT_ID` | Set it to `com.rochassurfschool.app`, which is the app's bundle id and not a secret | Parameter Store (T-13) and `apps/backend/.env` |

You create no key, certificate or token. The backend checks Apple's tokens with Apple's public keys, so it holds no
Apple secret.

## Steps

### 1. Open the portal

1. Open <https://developer.apple.com/account> in a browser and sign in with the Apple Account of your enrolment.
2. Under **Membership details**, check that your role is **Account Holder** or **Admin**. A personal enrolment is
   Account Holder.

### 2. Find the app's identifier

1. Click **Certificates, IDs & Profiles** (Apple's help pages also call it Certificates, Identifiers & Profiles).
2. In the left menu, click **Identifiers**.
3. Click `com.rochassurfschool.app` in the list. Its description may read differently, since EAS created it. If the
   list is long, use the search at the top right.

If it isn't listed, stop: the TestFlight build of spec 080 should have registered it, so something is off.

### 3. Turn on Sign In with Apple

1. On the **Capabilities** tab, find **Sign In with Apple** and tick its checkbox.
2. Click **Configure** on the same row (or **Edit**, if that is what the row shows).
3. Choose **Enable as a primary App ID**.
4. Leave the **Server to Server Notification Endpoint** empty: this spec doesn't use it.
5. Click **Save** in that dialog.

### 4. Save the App ID

1. Click **Save** at the top right of the page.
2. Apple warns that changing the App ID affects its provisioning profiles. Click **Confirm**. This is expected: EAS
   makes a new profile at the next build, and the app already on your phone keeps working.
3. Reload the page and check that Sign In with Apple is still ticked.

Tell the executor when this is done. That is T-12's "Done when".

### 5. What to expect from the build (T-14)

`npx eas-cli build --platform ios --profile testflight` runs from `apps/mobile`.

- EAS reads `ios.usesAppleSignIn` and checks the capability against the portal, so it should find it already on.
- If it asks you to sign in to Apple, sign in on your own terminal, including the two-factor code. Say yes when it asks
  to generate a new provisioning profile.
- App Store Connect needs nothing new for this capability.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| The build fails on a provisioning profile or entitlement | Check step 3 again, then run the build again. If it persists, run `npx eas-cli credentials --platform ios` from `apps/mobile`, and remove the profile of the `testflight` build so EAS makes a new one |
| The capability is unticked after the build | Turn it on again (steps 3–4), and tell the executor: the sync removed it, so `ios.usesAppleSignIn` isn't reaching the build |
| On the phone, "Continue with Apple" shows the generic error | The capability is usually missing from that build. Check it's ticked, and that the installed build is one made after step 4 |
| The Apple sheet shows the app's name as "RSS" | That is the app's display name, not an error |

## Starting over in the journey (T-14)

iOS Settings → your name → **Sign-In & Security** → **Sign in with Apple** → pick the app → **Stop Using** (**Delete** on
newer iOS versions). The next sign-in shows Apple's full sheet again, with the name and the choice to hide the email. The
labels vary between iOS versions.

Apple keeps giving the same person the same identity, so a sign-up on staging only starts from zero after that identity
is also gone from staging's database, which is why the journey in T-14 removes its test row.

## Not needed now

These come with the follow-up spec for token revocation, required before App Store submission. Don't create them yet:
an unused secret is only one more thing to keep safe.

| Item | Why it comes later |
| --- | --- |
| A Sign in with Apple private key (`.p8` file, under **Keys**) | Signs the backend's requests to Apple. Keep the file somewhere safe when you create it |
| Its Key ID | Names that key in those requests |
| Your Team ID (under **Membership details**) | Identifies your team in those requests |

## Apple and Expo references

- [Enable app capabilities](https://developer.apple.com/help/account/identifiers/enable-app-capabilities/)
- [About Sign in with Apple](https://developer.apple.com/help/account/capabilities/about-sign-in-with-apple/)
- [iOS capabilities on EAS](https://docs.expo.dev/build-reference/ios-capabilities/)
