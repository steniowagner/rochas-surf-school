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
  status (`requested` | `denied`), and the versions of the school rules it accepted. Relationships: one or
  more identities; many sessions. Lifecycle: as in Product; today only the creation of a `pending` student
  through an email code is built, plus the seeded review accounts.
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
  token (30 days) kept only as a hash, each sign-in starting its own family of refresh tokens. Renewing a
  session and signing out are not built yet.

## Who can do what

- **Anyone** — asks for a code and signs in or signs up with it; nothing else needs to be signed in yet.

## Boundaries

It does not send email itself: it hands the code, the address and the language to the email-delivery
capability through an abstract contract. It knows nothing about token formats or HTTP: the technical shape of
tokens is behind its own contract, provided by the backend. Deciding registrations, onboarding (WhatsApp number
and school rules), erasure and reactivation are rules of the account lifecycle still to be specified.

## Spec history

- `001-email-sign-in-code` — added sign-in codes (request, verify, cleanup, review accounts, lockout) and
  sessions (access and refresh tokens); email sign-ups create a pending student once a name is given.
