# Module: Authentication

## What it is for

It decides who a person is and lets them in without a password: one account per email address, reached by any
sign-in method that provides that address, and a session once they are in. It is the door every other part of
the product depends on. It brings together four business areas: **Accounts**, **Identities**, **Sign-in
codes** and **Sessions**.

## Accounts

A person's account, as [Product](../product.md) describes the **User** (`user`).

- **User** (`user`): key fields — name (3 to 80 characters, a full name of at least two words), email
  (stored trimmed and lowercase; never changes), photo, WhatsApp number and its visibility (hidden by default),
  role (`student` | `instructor` | `admin`, `student` by default), status (`pending` | `approved` | `denied` |
  `deleted` | `removed`, `pending` by default), denial reason (up to 500 characters) and dates, reactivation
  status (`requested` | `denied`) and when the request was sent, and the versions of the school rules it
  accepted. Relationships: one or
  more identities; many sessions. Lifecycle: as in Product; today the creation of a `pending` student
  through an email code or Google is built, plus the seeded review accounts, an admin approving or denying a
  `pending` account, an approved account adding or changing its WhatsApp number, an approved account changing
  its name, an approved account deleting itself, and a deleted account sending its reactivation request.
- **Changing one's name**: an approved account replaces its own name; the name is trimmed and must follow the same
  rules as at sign-up (refused with a `user.name.*` key otherwise, the stored name kept). Only the name changes;
  the email never does. Any other status is refused with `user.status.notApproved`.
- **Deleting one's account**: an approved account closes itself after a confirmation in the app; it becomes
  `deleted` with the moment of the deletion, and can then send its reactivation request. Any other status is
  refused with `user.status.notApproved`. After those checks and before the account is marked deleted, its
  upcoming class assignments are released (every role; a student has none): if releasing fails, the deletion
  fails as a whole and the account stays approved, and since releasing twice changes nothing more, trying again
  is safe. A reactivation doesn't bring the assignments back. Not built yet: refusing the only admin, cancelling
  the account's seats and enrolments (none exist yet), and erasing it 30 days later.
- **WhatsApp number**: stored with its country code in E.164 (e.g. `+5585999998888`) and valid for that
  country — a well-formed but impossible number, or one written with spaces, dashes, brackets or an extension,
  is refused. Only an `approved` account sets it (others are refused with `user.status.notApproved`); setting it
  always replaces both the number and its visibility, and an empty number is refused, so once set it is never
  emptied. Several accounts may share one number (a family phone).
- **WhatsApp visibility**: hidden by default; hidden means only admins see the number. The people directory is
  the only place other users' numbers are shown.
- **People directory**: an approved account of any role lists every `approved` user of any role, itself included
  (approved accounts that haven't finished onboarding too); pending, denied, deleted and removed accounts never
  appear. Each item carries only the id, name, role, creation date and WhatsApp number — never the email, photo,
  status or the visibility itself. The number is given when its owner shares it or when the viewer is an admin,
  and is none otherwise (or when there is no number): a hidden number never leaves the backend for anyone else.
  The list is always sorted A–Z by name ignoring case and accents (same names by id, so pages never overlap), 20
  per page by default (up to 50). It can be searched by name — a "contains" match ignoring case and accents, `%`
  and `_` taken literally, trimmed, up to 80 characters — and filtered by one or more roles (a user with any of
  them is listed). Wrong parameters are refused together: `people.page.invalid`, `people.perPage.invalid`,
  `people.role.invalid` (an unknown role or the parameter sent twice), `people.search.max.length`; the access
  check comes first.
- **Accepted school rules**: each acceptance is a version of the school rules with when it was accepted; one
  per version, and accepting a version already stored keeps the first one, even when two requests arrive at the
  same moment. The acceptances themselves are recorded by [School rules](school-rules.md).
- **Whether the current rules are accepted** (`rulesAccepted`): every answer that carries the account says it
  — yes when the account accepted the current version of the school rules, or while no rule was ever written
  (version 0); no otherwise, so an add, edit or delete makes it no again until the account accepts the new
  version, and an acceptance of an older version doesn't count. It is given for every status. The current
  version is read from School rules without this module depending on it.
- **Whether the rules were ever accepted** (`rulesAcceptedBefore`): every answer that carries the account also
  says whether it has an acceptance of any version, so the app tells a new version (the "Regras atualizadas"
  screen) from a first acceptance (the onboarding step). No while no acceptance exists, version 0 included.
- **Denial reason and reactivation status in every answer**: every answer that carries the account gives the
  denial reason (none when no reason was given) and the reactivation status (`requested`, `denied` or none), as
  stored and whatever the status, so the app can show the denied and account-deleted screens. The dates of a
  denial, deletion, removal or reactivation request are never returned.
- **One reactivation request**: a deleted account, of any role, sends it; it is recorded as `requested` with
  when it was sent, and the account stays deleted. Checked in this order: an account that isn't deleted is
  refused with `user.status.notDeleted` (even a removed one whose request was denied); a denied request can't
  be sent again (`user.reactivation.denied`); a request already sent is answered with the account and nothing
  changes, the first date kept. The 30-day window isn't checked, and admins aren't notified yet.
- **Registration** (a `pending` account, of any role): an approved admin lists them, oldest first (id, name,
  email, creation date), and approves or denies each one. Approving changes only the status; denying stores the
  optional reason, trimmed (a blank one is none; up to 500 characters), and when it was denied. The role never
  changes.
- **A registration is decided once**: an account that isn't `pending` is refused with
  `registration.status.notPending`, and of two decisions sent at the same moment exactly one wins — the other is
  refused the same way and nothing is overwritten. An id that isn't a UUID or names no account →
  `registration.notFound`; a reason that isn't text → `registration.reason.invalid`; a reason over 500 characters →
  `user.denialReason.max.length`. Nothing is written on any refusal.
- **A registration is announced and its decision is told**: when an account is created (by email code or by
  Google) — never when an existing account signs in — every approved admin is notified that it is waiting; once
  a decision is written, the person is notified of the approval, or of the denial with the trimmed reason (or
  none). Nothing is notified on a refusal or on the decision that lost a race. Notifying happens after the
  account or the decision is stored and never changes the answer: a failure is logged and the request succeeds
  as before. The person who doesn't get the push still sees the decision at the next launch, sign-in or session
  renewal.
- **A denied registration is erased 30 days after the denial**: every minute, each `denied` account denied
  30 × 24 hours ago or more is deleted with everything that hangs off it (identities, sessions, rules
  acceptances, its notifications and phones), after the admins' "new registration" notifications about it are
  deleted. Nothing is kept, anonymized or notified. A denied account with no denial date is never erased, and no
  other status is erased yet. A second run finds nothing to do. The email address is then free: signing in with
  it (by email code or Google) creates a new `pending` account, announced to the admins; the erased account's
  session is refused as invalid.
- **Any status gets a session**: a pending, denied, deleted or removed account still signs in and learns its
  status, so the app can show the waiting, denied or account-deleted screen.

## Identities

- **Identity** (`identity`): one way a user signs in — method (`google` | `apple` | `email`), the id the method
  gives the person, and the email it provides. Belongs to one user. An email identity's id is the normalized
  email address.
- **One account per email address**: signing in with an email code to an address whose account was created
  with another method opens that account and adds an email identity to it — never a second account. An account
  gets at most one email identity.
- **Google sign-in**: Google's token is checked first, and an address Google hasn't verified is refused before
  anything is looked up, so nobody can claim an account through an unconfirmed address. The account is then
  found by the Google identity's id (so a person keeps their account when their Google address changes), else by
  the email (a Google identity is added to that account, whatever its status), else a new pending student is
  created with a Google identity. The account's email never changes, even when Google's differs.
- **Name of a new Google account**: Google's name, trimmed, when it follows the account's name rules; a name sent
  by the app replaces it. When the name doesn't fit (Google names are often one word, the rule needs two), nothing
  is created and the app asks for one, then sends the same Google token with it. A name sent for an existing
  account is ignored.

## Sign-in codes

- **Sign-in code** (`sign-in-code`): the 6-digit code emailed to an address. Key fields: the address
  (normalized), the code kept only as a keyed hash, when it expires, when it was sent, wrong attempts. One per
  address: requesting a new one replaces it. Lifecycle: sent → used (deleted on a correct verify), replaced by
  a new request, locked after 5 wrong guesses, or expired after 10 minutes and then deleted within a minute.
- **A new code only 30 seconds after the last one was sent**: sooner is refused with the time a new one becomes
  available, so the app can show a countdown. If the email couldn't be sent, nothing is kept and the person can
  ask again at once — nobody waits for an email that never left.
- **The email is in the language chosen on the sign-in screen** (pt-BR, es or en; pt-BR when none is given).
- **Asking for a code answers the same whether or not the account exists**: the address alone reveals nothing.
- **Checking a code, in order**: no code for the address → invalid; 5 wrong guesses already → locked; past its
  10 minutes → expired (the person asks for a new one); wrong code → invalid and one more wrong guess counted.
  A correct code works once, even if two attempts arrive at the same moment.
- **A new address gives a name before the account exists**: a correct code for an address without an account
  asks for a name, without using the code or counting a guess; the account is created, as a pending student
  with that name, only when the name is valid. Only someone holding the right code learns that no account
  exists. A name sent for an existing account is ignored.
- **Review accounts**: one pre-approved account per role, each with a fixed code. Asking for a code for one of
  them sends no email; its fixed code works only for its own address, and the waiting time and the lock apply
  as for anyone — the lock also protects the admin review account from guessing.
- **Limits per network address**: at most 5 code requests and 10 code checks per minute.

## Sessions

- **Session**: what a correct code returns — a short access token (15 minutes) naming the user, and a refresh
  token (30 days) kept only as a hash, each sign-in starting its own family of refresh tokens.
- **Every request sees the account as it is now**: role and status are read again on each request, so an
  approval, denial, removal, deletion or role change applies at once, not when the access token expires. A
  request whose token is missing, bad, expired or names an account that no longer exists is refused with
  `auth.token.invalid`.
- **Renewing a session replaces its refresh token**: the one used stops working and a new one, in the same
  sign-in, lasts 30 days from the renewal — an active person stays signed in. Any account status can renew.
  An unknown, expired or ended refresh token is refused with `auth.refreshToken.invalid`.
- **Reusing an old refresh token ends that sign-in**: a refresh token that was already replaced (a stolen copy,
  or the loser of two renewals at the same moment) ends every token of its sign-in; the account's other
  sign-ins are untouched.
- **Signing out ends one sign-in**: it uses the refresh token, so it works after the access token expired; the
  account's other devices stay signed in. It always succeeds, and an unknown, expired or ended token changes
  nothing. A missing refresh token is refused with `refreshToken.token.required` (on renewal too).
- **Signing out stops the pushes to that phone**: when the sign-out names the phone's push token and the refresh
  token is known — active, ended or expired, since it proves whose phone it is — that token is removed if it
  belongs to the same account; another account's token is never touched. The sign-out still always succeeds.
- **On the phone, a session ends only two ways**: the person signs out, or the backend refuses to renew it. Being
  offline, a timeout, a server error or a throttled renewal never ends it. A renewal also brings the account as it
  is now, so the app follows a status or role change made meanwhile.

## Who can do what

- **Anyone** — asks for a code and signs in or signs up with it; signs in or signs up with a Google account
  whose address Google verified (10 requests per minute per network address).
- **A signed-in account, of any status** — reads its own account (name, email, role, status, creation date,
  WhatsApp number and its visibility, whether it accepted the current school rules, its denial reason and its
  reactivation status).
- **An approved account** — sets its own WhatsApp number and visibility, changes its own name, deletes its
  own account, and reads the people directory (any role; anyone else gets `user.status.notApproved`).
- **A deleted account** — sends its one reactivation request.
- **An approved admin** — lists the pending registrations and approves or denies each one, with an optional
  reason when denying. Anyone else is refused: an account that isn't approved with `user.status.notApproved`
  (checked first, so a removed admin gets it), an approved non-admin with `user.role.notAdmin` — before the id is
  even looked up.
- **Anyone holding a refresh token** — renews or ends that session (10 requests per minute per network address
  for each).
- **In the app**, "Continue with email" asks whether the person already has an account: "I have an account"
  opens Sign in with email, "I'm new here" opens Create account.
- **In the app**, a person with an account gives only the email address on Sign in with email (same address
  rules and error messages as Create account); the code check then sends no name. An address with no account
  on that path gets a message and opens Create account with the address filled in — the code stays usable, so
  the person only adds a name. "Create account" on Sign in with email also opens Create account with the
  address typed so far.
- **In the app**, a new person gives their name and email address on the Create account screen before the
  code is sent; the app keeps the name and sends it with the code check, which creates the account. Asking
  for a code sends only the address and the language. The app accepts a name and an address only when they
  follow the same rules as the account, so the backend won't refuse them.
- **In the app**, the code is checked on the Confirm email screen, sending the name kept from Create account
  (none on the sign-in path); "change the email" returns to the screen that asked for the code;
  the same screen asks for a new code once 30 seconds have passed since the last one.
- **In the app**, a correct code puts the account in the session and opens the part of the app that matches
  its status and role: the Pending screen for a pending account, onboarding for an approved one that hasn't
  finished it, its role's experience for an approved one that has, reactivation for a deleted
  one, and its own screen for a denied or removed one. Every other part stays unreachable.
- **In the app**, a pending account sees only the Pending screen: that the school still has to approve it, the
  address it signed in with, and since when the account exists ("Now", then a relative time, then the date
  after a week). Its only way out is signing out.
- **In the app**, onboarding starts with the WhatsApp step for an approved account without a number, of any
  role: a welcome with the person's first name, the number with its country (Brazil +55 preselected, any
  country picked from a searchable list with names in the app's language), and "Hide my number", on by default.
  "Save and continue" works only once the number is valid for the chosen country (same rule as the backend);
  it saves the number and visibility and opens the School rules step, without a way back. An account that has
  a number opens School rules directly. School rules is still empty, and onboarding never completes yet, so no
  account reaches its role's experience. The WhatsApp step has no back button and no sign-out; if the session
  expired while saving, the app says so once and returns to sign-in.
- **In the app**, "Continue with Google" opens Google's account picker and signs the person in to the account
  the backend finds or creates, into the part of the app that matches it (Pending for a new account); the button
  shows its loading state and ignores another tap meanwhile. When Google's name doesn't fit, the "Your name"
  screen opens with it filled in, checks it with Create account's rules and messages, and sends it; if Google's
  token expired meanwhile, it says so and returns to sign-in. Closing the picker shows nothing; every other
  failure shows one short message. The Apple button isn't shown until Apple sign-in is built.
- **In the app**, every approved role has a Profile tab: "Editar perfil" changes the name (the email shown
  read-only, "can't be changed"; "Salvar" works only for a changed name that follows the rules), the WhatsApp row
  shows "Visível" or "Oculto" from the session's account and opens the number, its country and the share switch
  prefilled (saved only when valid and changed), and "Remover a conta" asks for confirmation, closes the account
  and signs out. A saved change updates the session at once.
- **In the app**, signing out (from the Pending screen, the Profile's "Sair" sheet, and "Use another email" on every closed-account screen)
  forgets the session on the phone at once and returns to the sign-in screen, then asks the backend to end that
  sign-in without waiting for the answer — so it works offline too. It also signs out of Google, so the next
  Google sign-in shows the account picker.
- **In the app**, the session is kept on the phone, so closing and reopening the app keeps the person signed in:
  at launch, behind the splash screen, the app reloads the account and opens the part that matches it now;
  offline (or after about 8 seconds without an answer) it opens by the last known account. The session renews by
  itself before the access token runs out and after a refused token, one renewal at a time. When the backend
  refuses the renewal, the app forgets the session, returns to sign-in and shows "Your session expired. Sign in
  again." once, however many calls failed together. Signing out while a renewal runs ends the newest token that
  renewal produced.
- **In the app**, a denied account sees that its registration wasn't approved, the address it signed in with,
  and the admin's reason exactly as written ("Message from the team"; nothing when no reason was given), and can
  contact the school on WhatsApp when the school has a number.
- **In the app**, a deleted account sees the Account deleted screen in the state of its request: not requested,
  with "Request reactivation", which sends its one request and switches the screen to "Request sent" in place;
  requested, waiting for the team; or denied, with only "Use another email". The decision is seen at the next
  launch or sign-in, or when the session renews. If the account changed meanwhile (no longer deleted), the app
  says so and signs out; an expired session is handled as everywhere in the app.
- **In the app**, an approved admin who finished onboarding opens "School tools", whose "Join the school" row
  shows how many registrations are waiting (no count while loading or after an error). The tool shows a card per
  registration, oldest first — initials, name and email — with Deny and Approve, under "N waiting for approval",
  the title and a description, and pull-to-refresh. Tapping a card's upper part opens the person's sheet (initials,
  name, "Student" and their email; no WhatsApp, which a registration doesn't have yet). Approve acts at once; Deny
  opens "Deny entry?" with an optional reason (counter up to 500), "Deny and notify" and "Back"; closing the sheet
  ("Back", a swipe or the backdrop) sends nothing and empties the reason, and the sheet rises above the keyboard
  while the reason is typed. While a card's decision is sent, its two buttons are disabled; other cards stay
  usable. A decided card just leaves the list and the count goes down. An already decided registration shows
  "This registration was already decided." and reloads the list; other failures show their toast and keep the
  card (and the sheet with its reason).
- **In the app**, every approved role opens the People screen — a student from the Escola tab, an admin from the
  "Pessoas" row under "Escola" on the home (below "Ferramentas" and "Entrar na escola"), an instructor from the
  "Pessoas" row of the "Painel" (Início); both rows read a fixed "9 na plataforma" for now. The screen shows the
  unfiltered number of approved members, a search that waits 300 ms after the last key, one toggle button per role
  (none selected = everyone), and the people A–Z under letter headers — initials, name, "desde <mês ano>", role —
  loading the next 20 at the end, with pull-to-refresh and loading, empty and error-with-retry states. A person's
  sheet opens WhatsApp on the phone with their number when the viewer may see it, and otherwise shows a disabled
  "Número não compartilhado." row.
- **In the app**, a removed account sees that its access was removed and can't be reactivated from the app, and
  can contact the school on WhatsApp when the school has a number; a stored reactivation status changes
  nothing for it.

## Boundaries

It does not check Google's tokens itself: a contract verifies them, provided by the backend. It does not send
email itself: it hands the code, the address and the language to the email-delivery
capability through an abstract contract. It knows nothing about token formats or HTTP: the technical shape of
tokens is behind its own contract, provided by the backend. The school rules themselves and their version belong to
[School rules](school-rules.md), which also decides when an acceptance is allowed; this module keeps only the
versions each account accepted and reports whether the current one is among them. Deciding registrations belongs
here (spec 019), since a registration is a `pending` user. It decides **when** a registration is announced or
its result told, but doesn't store or push notifications: it calls two abstract contracts — one that notifies
about registrations and one that removes a phone's push token on sign-out — provided by the backend with
[Notifications](notifications.md), which doesn't depend on this module (spec 020). It decides **when** a denied
registration is erased, and asks a third contract, provided the same way, to delete the admins' "new
registration" notifications about it (spec 021). Deleting one's own account is built (spec 026); it releases the
account's upcoming classes through a fourth contract of its own, fulfilled by the backend with
[Classes](classes.md)' release (spec 035) — this module never depends on Classes. The role-change and removal
rules are meant to use the same contract. Removing accounts, the erasure of deleted and removed accounts, notifying admins of reactivation
requests, and deciding reactivation requests are rules of the account lifecycle still to be specified.

## Spec history

- `001-email-sign-in-code` — added sign-in codes (request, verify, cleanup, review accounts, lockout) and
  sessions (access and refresh tokens); email sign-ups create a pending student once a name is given.
- `002-email-create-account-screen` — the app's Create account screen asks for a code by email, collecting the
  name before the code; a request refused because a code was sent less than 30 seconds ago counts as sent.
- `003-email-confirm-code-screen` — the app's Confirm email screen checks the typed or pasted code, sending the
  name from Create account, and asks for a new code after 30 seconds.
- `004-backend-session-endpoints` — the backend reads the current account, renews a session (rotation, reuse
  ends the sign-in, sliding 30 days) and signs out one sign-in; every request reloads role and status; the
  verified user gains its creation date.
- `005-mobile-flow-routing` — the app keeps the verified account in memory and opens one flow per account
  state (onboarding, reactivation, denied, removed, student, instructor, admin), each unreachable from the others.
- `006-mobile-pending-screen` — a pending account opens its own Pending screen (its own flow, no longer
  onboarding), which shows since when the account exists; signing out from it ends the sign-in on the phone and
  on the backend and returns to sign-in. The app keeps the session's tokens and the account's creation date.
- `007-email-sign-in-screens` — "Continue with email" opens a Choose screen; the new Sign in with email screen
  asks only for the address and verifies without a name; an address with no account on that path is sent to
  Create account with the address filled in. Create account can start with an address.
- `008-onboarding-whatsapp` — an approved account adds its WhatsApp number (E.164, validated per country) and
  its visibility (hidden by default) through the WhatsApp onboarding step; only approved accounts may; the
  session's account carries both; onboarding then opens an empty School rules step.
- `011-school-rules-acceptance` — accepted school rules versions are stored with when they were accepted (a
  repeat keeps the first); every answer that carries the account (current account, code check, renewal,
  WhatsApp number, accepting the rules) says whether the current rules are accepted.
- `013-school-rules-update` — every answer that carries the account says whether it ever accepted any version of
  the school rules; the app sends an account that accepted before and missed a change to the "Regras
  atualizadas" screen instead of onboarding.
- `014-account-reactivation-request` — every answer that carries the account gives the denial reason and the
  reactivation status; a deleted account sends its one reactivation request (`POST /auth/me/reactivation-request`),
  stored with when it was sent; a repeat changes nothing and a denied request can't be sent again.
- `016-closed-account-screens` — the app's Denied, Account deleted (not requested, requested, denied) and
  Access removed screens replace the placeholders: the denial reason, the reactivation request sent from the
  screen, "Contact the school" on WhatsApp for denied and removed accounts, and "Use another email" (sign-out)
  on every state.
- `017-google-sign-in` — Google sign-in (`POST /auth/google`): by Google identity, else linked by email, else a
  new pending student; unverified Google addresses refused; a new account needs a name that fits the rules
  ("Your name" in the app); the app's "Continue with Google" works, the Apple button is hidden, and signing out
  also signs out of Google.
- `018-mobile-session-persistence` — the app keeps the session on the phone (`expo-secure-store`) and restores it
  at launch behind the splash screen, reloading the account; it renews the session before expiry and after a
  401, one refresh at a time, storing the returned account; only a refused renewal or a sign-out ends it, with one
  "session expired" message; sign-out waits for a running renewal to end its newest token.
- `019-admin-registration-decisions` — approved admins list pending registrations (`GET /registrations`) and
  approve or deny them (`POST /registrations/:id/approve|deny`, optional trimmed reason up to 500); a decision is
  final, written only while the account is still pending, so one of two concurrent decisions wins; the app's
  admin home "School tools" and its "Join the school" tool, built on reusable decision components.
- `020-push-notifications-registrations` — a new account (email or Google) notifies every approved admin, and an
  approval or denial (with its reason) notifies the person, through the `RegistrationNotifier` contract, after
  the write and without changing the answer; sign-out takes the phone's push token and removes it through the
  `PushTokenRemover` contract, for any known refresh token.
- `021-denied-registration-erasure` — a denied registration is erased (hard deleted with what hangs off it) 30
  days after the denial by a job that runs every minute, its admins' "new registration" notifications deleted
  first through the `RegistrationNotificationEraser` contract; the same email can then sign up again.
- `025-ci-tests` — no business change: the package declares its dependency on `@rochas-surf-school/shared`, so
  Turbo builds `shared` first and counts a `shared` change as affecting `auth`.
- `026-profile-tab` — an approved account changes its own name (`PUT /auth/me/name`, trimmed, the entity's rules)
  and deletes its own account (`DELETE /auth/me`: `approved` → `deleted`, deletion date stamped; the app then signs
  out); the app's Profile tab edits the name and the WhatsApp number and visibility, signs out and removes the
  account.
- `027-people-directory` — any approved account reads the people directory (`GET /people`: approved users only,
  A–Z ignoring case and accents, paged, searched by name ignoring accents, filtered by any of several roles), with
  a WhatsApp number only when its owner shares it or the viewer is an admin; the app's People screen for every
  role (student's Escola tab, admin's and instructor's home rows) and its person sheet with the WhatsApp chat.
- `035-class-no-instructor` — deleting one's own account first releases its upcoming class assignments through
  the `TeachingReleaser` contract, while the account is still approved; a failed release fails the deletion and
  keeps the account approved.
- `039-join-school-design` — no business change: the app's "Join the school" tool follows its designs (count,
  description, cards with email and icon buttons, the person's sheet with the email, the new deny sheet copy with
  "Back"), and a decided card just leaves the list, without "Decided just now".
