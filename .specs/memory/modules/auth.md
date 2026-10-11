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
  more identities; many sessions. Lifecycle: as in Product; today only the creation of a `pending` student
  through an email code is built, plus the seeded review accounts, an approved account adding its
  WhatsApp number, and a deleted account sending its reactivation request.
- **WhatsApp number**: stored with its country code in E.164 (e.g. `+5585999998888`) and valid for that
  country — a well-formed but impossible number, or one written with spaces, dashes, brackets or an extension,
  is refused. Only an `approved` account sets it (others are refused with `user.status.notApproved`); setting it
  always replaces both the number and its visibility, and an empty number is refused, so once set it is never
  emptied. Several accounts may share one number (a family phone).
- **WhatsApp visibility**: hidden by default; hidden means only admins see the number. Nothing shows other
  users' numbers yet.
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
- **Any status gets a session**: a pending, denied, deleted or removed account still signs in and learns its
  status, so the app can show the waiting, denied or account-deleted screen.

## Identities

- **Identity** (`identity`): one way a user signs in — method (`google` | `apple` | `email`), the id the method
  gives the person, and the email it provides. Belongs to one user. An email identity's id is the normalized
  email address.
- **One account per email address**: signing in with an email code to an address whose account was created
  with another method opens that account and adds an email identity to it — never a second account. An account
  gets at most one email identity.

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

## Who can do what

- **Anyone** — asks for a code and signs in or signs up with it.
- **A signed-in account, of any status** — reads its own account (name, email, role, status, creation date,
  WhatsApp number and its visibility, whether it accepted the current school rules, its denial reason and its
  reactivation status).
- **An approved account** — sets its own WhatsApp number and visibility.
- **A deleted account** — sends its one reactivation request.
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
  expired while saving, the app says so and signs out.
- **In the app**, signing out (from the Pending screen, for now) forgets the session on the phone at once and
  returns to the sign-in screen, then asks the backend to end that sign-in without waiting for the answer — so
  it works offline too.

## Boundaries

It does not send email itself: it hands the code, the address and the language to the email-delivery
capability through an abstract contract. It knows nothing about token formats or HTTP: the technical shape of
tokens is behind its own contract, provided by the backend. The school rules themselves and their version belong to
[School rules](school-rules.md), which also decides when an acceptance is allowed; this module keeps only the
versions each account accepted and reports whether the current one is among them. Deciding registrations, the
school-rules step of onboarding, deleting and removing accounts, erasure, notifying admins of reactivation requests and deciding them are rules
of the account lifecycle still to be specified.

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
