---
id: "079"
slug: staging-backend-infra
title: Staging backend and infrastructure on AWS and Supabase
status: in-progress
created: 2026-10-30
started: 2026-10-30
base_commit: b6d7cd77915004379a603167f34eedc9b78f9af6
fronts: [backend, web, infra]
depends_on: []
---

# 079 — Staging backend and infrastructure on AWS and Supabase

## Goal

Put the backend on a real, always-on server so the app can be tested on real phones outside the developer's
machine. The school's API runs at `https://api-staging.rochassurfschool.com`, on one small EC2 server behind API
Gateway, with its database on Supabase and every piece of infrastructure described in Terraform. The scheduled jobs
run all day, the 12 test sets exist, and sign-in codes reach real inboxes, so spec 080 can point the mobile builds at
a working API. This is a testing environment: it stays small and cheap, and it decides nothing about production.

## Context

- Product: [product.md](../../memory/product.md) — relevant concepts: the test accounts and their fixed codes; the
  privacy policy names the providers the app uses.
- Requirements: [requirements.md → Review accounts](../../../.docs/requirements.md#review-accounts) — pre-approved
  accounts that sign in with a fixed code;
  [requirements.md → Privacy policy page](../../../.docs/requirements.md#privacy-policy-page) — the public policy,
  which names who handles the data.
- Technical: [technical-context.md](../../memory/technical-context.md) — relevant sections: Deployment ("decided by
  the first spec that deploys"), Authentication (rate limits, "how the client IP is read behind a proxy is decided by
  the first spec that deploys"), External integrations (a spec that chooses hosting updates the policy), Scheduled
  work, Automated validation, Continuous integration.
- Existing code this builds on:
  - `apps/backend/src/main.ts` — `NestFactory.create`, `enableCors`, listens on `PORT`.
  - `apps/backend/Dockerfile` — multi-stage image; today its build fails with `TS2307` because only the backend is
    built, the workspace packages never are, and the runtime stage copies only `apps/backend/dist`. Its `HEALTHCHECK`
    fetches `/`, which has no route.
  - `apps/backend/src/modules/auth/auth.controller.ts` — five routes use `@UseGuards(ThrottlerGuard)`, in memory, by
    IP.
  - `apps/backend/src/db/database-url.ts` and `apps/backend/prisma.config.ts` — both honour `DATABASE_URL`.
  - `apps/backend/prisma/seed/main.ts` — seeds the review accounts from `REVIEW_ACCOUNTS`; the sample classes skip
    themselves in production.
  - `apps/web/src/i18n/dictionaries/{en,pt-br,es}.ts` — the policy's services list ("A cloud hosting service, where
    the app and its database run.").
  - `.github/workflows/ci.yml` — tests only, with no GitHub secrets.
- The domain is already prepared: `rochassurfschool.com` has its DNS at Hostinger, is verified in Resend (São Paulo
  region), and its `send` SPF record was added on 2026-10-30. `api-staging` is a free name, and the zone has no CAA
  record and no DNSSEC.

## Scope

### In scope

- A public health route and client-IP rate limiting that works behind API Gateway.
- A backend Docker image that builds from the repo root and runs on ARM.
- Terraform for the network, server, roles, logs, API Gateway, custom domain, Supabase project, state bucket and
  deploy role, with tests and a CI check.
- A deploy workflow started by hand, which applies the migrations, seeds the test accounts and starts the new image.
- The privacy policy naming AWS, Supabase and Vercel in the three languages.
- A setup guide, the real `apply`, and the first deploy.

### Out of scope

- Production infrastructure, or any decision about where production runs.
- The mobile builds, EAS and the store accounts (spec 080).
- Database backups, monitoring, alarms and uptime checks.
- A load balancer, NAT gateway, WAF, RDS, autoscaling and more than one server.
- Photo storage, which has no provider yet.
- Running the 12 test sets' journeys; this spec only proves the accounts exist and sign in.
- Deleting the duplicate Vercel projects or moving the website to `rochassurfschool.com`.
- Moving the domain's DNS to Route 53 or managing Hostinger records with Terraform.

## Decisions

| ID   | Decision | Reason |
| ---- | -------- | ------ |
| D-01 | Everything runs in `us-east-1` (Virginia), the Supabase project included. | About $18 a month against about $26 in São Paulo, so the AWS credits last longer. The roughly 25 ms of extra latency doesn't matter for testing. The server and database sit in the same region. |
| D-02 | One `t4g.small` EC2 server (ARM, Amazon Linux 2023) running one Docker container, on a new AWS account's free plan. | It's in the free plan's list of eligible instances and is enough for one Nest process with the school's load. |
| D-03 | Traffic goes API Gateway HTTP API → VPC link → Cloud Map service → server, with no load balancer. The gateway's `execute-api` address is disabled. | A direct HTTP integration would leave the server open to the internet, in plain HTTP. An ALB costs far more than the rest of the stack together. |
| D-04 | The server's security group allows port 4000 only from the VPC link's security group, and nothing else inbound. Port 22 stays closed; access is through SSM Session Manager and Run Command. | Nothing on the server is reachable from the internet, and no SSH key exists to leak. |
| D-05 | The server keeps a public IP for outbound traffic only (Supabase, Expo, Resend, Anthropic, Google). There is no NAT gateway. | A public IP costs about $3.65 a month and a NAT gateway over $30. The security group already blocks inbound traffic. |
| D-06 | API Gateway writes the caller's IP into `x-client-ip` (`overwrite:header.x-client-ip` = `$context.identity.sourceIp`). A guard that extends `ThrottlerGuard` uses that header as the tracker when `CLIENT_IP_HEADER` is set, and the plain IP otherwise. Express `trust proxy` is not used. | The behavior of `X-Forwarded-For` through HTTP API mappings isn't documented clearly. The server is only reachable through the gateway, which overwrites the header, so a caller can't fake it. Without the env var, local behavior doesn't change. |
| D-07 | One process keeps the scheduled jobs and the in-memory rate limits. | Both already assume one instance, and D-02 keeps that true. |
| D-08 | The server runs `NODE_ENV=production` with real keys. `RESEND_API_KEY`, `EMAIL_FROM`, `ANTHROPIC_API_KEY` and `GOOGLE_MAPS_API_KEY` reuse the values in the developer's `apps/backend/.env`, copied to Parameter Store without being printed. Anthropic gets a spending limit, and no sample classes are seeded. | Staging must behave like the real app. The backend refuses to start in production without its keys. The user chose to reuse the keys that already work locally. |
| D-09 | Secrets are SSM Parameter Store `SecureString` values under `/rochas/staging/`, one per variable, set by hand. Terraform creates the path's permissions, never the values. `REVIEW_ACCOUNTS` has its own parameter, within the 4 KB limit of the standard tier. | The repo is public, so no secret may reach it. One place to read and rotate them. |
| D-10 | Terraform runs on the developer's machine, and CI only checks it. State lives in a versioned, encrypted, private S3 bucket with `use_lockfile`, created by a small bootstrap stack. | State holds the database password. CI has no AWS credentials, and for one developer a remote apply pipeline adds risk without benefit. |
| D-11 | The deploy is manual: `workflow_dispatch`, or a push to the `deploy/staging` branch. It runs on GitHub's native `ubuntu-24.04-arm` runner, publishes a public image to GHCR, and signs in to AWS with OIDC, with a role trusted only for this repo's `staging` environment. The role can only send commands to this instance and read the two parameters of D-12. | `workflow_dispatch` only works once the file is on `main`, so the branch trigger lets the first deploy run from the spec's branch. A native runner avoids slow emulation. No long-lived AWS key exists. The image holds no secrets. |
| D-12 | Migrations and the seed run on the GitHub runner, reading `DATABASE_URL` and `REVIEW_ACCOUNTS` from Parameter Store, before the server is told to restart. | `prisma` and `tsx` are dev dependencies, so they aren't in the runtime image. Migrating first means a failed migration stops the job while the old version keeps running. |
| D-13 | The API's address is `api-staging.rochassurfschool.com`, with a free ACM certificate. The two CNAMEs are added by hand at Hostinger. | The URL is built into the phone apps, so it must stay stable. Keeping DNS at Hostinger leaves the domain's other records untouched. |
| D-14 | `EMAIL_FROM` is `admin@rochassurfschool.com`, the value already in `apps/backend/.env`. | The root domain is already verified in Resend, so no second domain is needed, and staging uses the same sender as local development. |
| D-15 | Container logs go to CloudWatch through Docker's `awslogs` driver, kept 14 days. | Logs stay readable without opening a session on the server, and the short retention stays within the cost target. |
| D-16 | `GET /health` is public, is in its own Nest module, and only runs `SELECT 1`. | API Gateway, Docker and the deploy all need one anonymous check, and it reveals nothing. |
| D-17 | The website stays on Vercel. | It already works there, and nothing in this spec needs it to move. |

## Expected Results

### ER-01 — Health route

- **Front:** backend
- **Behavior:** Given the backend is running with its database reachable, when anyone calls `GET /health` without a
  token, then it answers 200 with `{ "status": "ok" }`.
- **Edge and error cases:** when the database can't be reached, it answers 503 with
  `errors: ["health.database.unreachable"]`.
- **Verify by:** `npx vitest run --config ./vitest.config.e2e.ts test/health.e2e-spec.ts` from `apps/backend`.

### ER-02 — Rate limits count each client separately behind the gateway

- **Front:** backend
- **Behavior:** Given `CLIENT_IP_HEADER=x-client-ip`, when two callers with different `x-client-ip` values call
  `POST /auth/email/code`, then using up the limit with one value leaves the other value unaffected.
- **Edge and error cases:** with `CLIENT_IP_HEADER` unset, the header is ignored and the plain IP counts, so changing
  it doesn't escape the limit. With it set and the header missing, the plain IP counts.
- **Verify by:** `npx vitest run src/modules/auth/client-ip-throttler.guard.spec.ts` and
  `npx vitest run --config ./vitest.config.e2e.ts test/auth-email.e2e-spec.ts -t "rate limit"` from `apps/backend`.

### ER-03 — The image builds and reports healthy

- **Front:** backend
- **Behavior:** Given a clean checkout, when the image is built from the repo root and started with a database, then
  the build exits 0 and Docker reports the container `healthy`.
- **Edge and error cases:** the image contains no `.env` file, and it builds for `linux/arm64`.
- **Verify by:** `docker build --platform linux/arm64 -f apps/backend/Dockerfile -t rochas-backend .` exits 0;
  `docker compose up --build -d` from `apps/backend`, then `docker inspect --format '{{.State.Health.Status}}'` on the
  backend container prints `healthy`; `docker run --rm --entrypoint sh rochas-backend -c 'test ! -e /app/apps/backend/.env'`
  exits 0.

### ER-04 — The Terraform forbids inbound traffic from the internet

- **Front:** infra
- **Behavior:** Given the staging configuration, when its tests run, then they prove the server's security group has
  no ingress from `0.0.0.0/0` or `::/0`, none on port 22, and port 4000 only from the VPC link's security group.
- **Edge and error cases:** the tests run without AWS or Supabase credentials. They also assert the server requires
  IMDSv2 and has an encrypted root volume.
- **Verify by:** `terraform -chdir=infra/terraform/staging test`.

### ER-05 — The API answers on its public address

- **Front:** infra
- **Behavior:** Given the stack is applied and the CNAMEs are in place, when anyone calls
  `https://api-staging.rochassurfschool.com/health`, then it answers 200 with `{ "status": "ok" }` over a valid
  certificate.
- **Edge and error cases:** plain `http://` doesn't reach the API. The `execute-api` address doesn't answer.
- **Verify by:** `curl -si https://api-staging.rochassurfschool.com/health` shows `HTTP/2 200` and the body, and
  `curl -v` reports the certificate verified.

### ER-06 — The server can't be reached directly

- **Front:** infra
- **Behavior:** Given the server's public IP, when anyone connects to it from the internet on port 4000 or 22, then
  the connection fails.
- **Edge and error cases:** the server's own outbound calls keep working, which ER-10 proves.
- **Verify by:** `nc -vz -w 5 <public-ip> 4000` and `nc -vz -w 5 <public-ip> 22` both fail, with the IP from
  `terraform -chdir=infra/terraform/staging output -raw server_public_ip`.

### ER-07 — A deploy ships the new version, and a failed migration ships nothing

- **Front:** infra
- **Behavior:** Given a commit, when the deploy workflow runs, then it publishes the image, applies the migrations,
  seeds the test accounts and restarts the server on the new image, and it fails unless `/health` answers 200 within
  2 minutes of the restart.
- **Edge and error cases:** when a migration fails, the job stops before the restart and the running version keeps
  answering. A second deploy of the same commit changes nothing and the seed doesn't duplicate accounts.
- **Verify by:** a green run on the `deploy/staging` branch; `/health` still answers during a run on a throwaway commit
  with a broken migration, which fails at the migrate step and is then removed.

### ER-08 — Scheduled jobs run on the server

- **Front:** infra
- **Behavior:** Given the server is running, when a class starts within 30 minutes, then within 2 minutes its
  `reminder_sent_at` is set without any request reaching the API.
- **Edge and error cases:** an already reminded class keeps its original `reminder_sent_at`.
- **Verify by:** create a class starting in 25 minutes through the API or the app, then read `reminder_sent_at` in
  Supabase's SQL editor.

### ER-09 — The test sets exist and sign in

- **Front:** infra
- **Behavior:** Given the seed ran, when each of the 12 test sets' accounts signs in with its fixed code through
  `https://api-staging.rochassurfschool.com`, then each gets tokens and the role in its hand-out table.
- **Edge and error cases:** a fixed code used with another email is refused.
- **Verify by:** one verify-code request per account from the table `npm run test-accounts --workspace apps/backend`
  printed, run from the developer's machine; the codes stay out of the repo and out of the task evidence.

### ER-10 — A sign-in code reaches a real inbox

- **Front:** infra
- **Behavior:** Given a real email address that isn't a test account, when it requests a code from the staging API,
  then the email arrives from `admin@rochassurfschool.com` with a 6-digit code, and that code signs in.
- **Edge and error cases:** the code's email passes SPF and DKIM, as shown in the message's authentication results.
- **Verify by:** request a code with `curl`, then read the message and its headers in the inbox.

### ER-11 — Logs reach CloudWatch

- **Front:** infra
- **Behavior:** Given the container is running, when it logs anything, then the line appears in the
  `/rochas/staging/backend` log group, whose retention is 14 days.
- **Edge and error cases:** no sign-in code, token or email address of a real person appears in those logs.
- **Verify by:** `aws logs tail /rochas/staging/backend --since 10m` after calling the API;
  `aws logs describe-log-groups --log-group-name-prefix /rochas/staging` shows `retentionInDays: 14`.

### ER-12 — The privacy policy names the hosts

- **Front:** web
- **Behavior:** Given the privacy policy page in any of the three languages, when someone reads who handles the data,
  then it names Amazon Web Services, Supabase and Vercel, and what each one does.
- **Edge and error cases:** the generic "cloud hosting service" line no longer appears. The photo storage line stays
  as it is.
- **Verify by:** the `privacy policy names the hosting providers` tests in `apps/web/e2e/pages.e2e.ts`.

## Tasks

### Backend (`apps/backend`)

- [x] **T-01** — Add `GET /health` with `@Public()` and `SELECT 1`, in `src/modules/health/` (controller, module,
  registered in `src/app.module.ts`), answering 503 with `health.database.unreachable` when the query fails, plus
  `test/health.e2e-spec.ts` and a controller unit test. Skill:
  [`backend-nest-controller`](../../../.claude/skills/backend-nest-controller).
  Covers: ER-01 · Done when: `npx vitest run --config ./vitest.config.e2e.ts test/health.e2e-spec.ts` passes.
  > ✅ 2026-10-30 17:46 — added the public `GET /health` running `SELECT 1`, 503 through
  > `ServiceUnavailableException` (the global filter gives `errors: ["health.database.unreachable"]`); files:
  > `apps/backend/src/modules/health/health.controller.ts`, `apps/backend/src/modules/health/health.controller.spec.ts`,
  > `apps/backend/src/modules/health/health.module.ts`, `apps/backend/src/modules/health/health.integration.http`,
  > `apps/backend/src/app.module.ts`, `apps/backend/test/health.e2e-spec.ts`; verified:
  > `npx vitest run --config ./vitest.config.e2e.ts test/health.e2e-spec.ts` (2 passed, failed first with no route),
  > `npx vitest run src/modules/health` (3 passed), `tsc --noEmit` clean; deviations: the controller skill is written
  > for use cases; this route has none, so only its controller, module and `.integration.http` shape applied.

- [x] **T-02** — Add `src/modules/auth/client-ip-throttler.guard.ts`, overriding `getTracker` as in D-06, use it in the
  five `@UseGuards` of `src/modules/auth/auth.controller.ts`, update the guard assertions in `auth.controller.spec.ts`,
  add its unit tests and the two-clients case to `test/auth-email.e2e-spec.ts`, and document `CLIENT_IP_HEADER` in
  `.env.example`.
  Covers: ER-02 · Done when: both commands in ER-02's Verify by pass.
  > ✅ 2026-10-30 17:47 — added `ClientIpThrottlerGuard`, used by the five auth routes; it passes the header's value
  > through the base `getTracker`, so IPv6 callers keep the library's /64 grouping; files:
  > `apps/backend/src/modules/auth/client-ip-throttler.guard.ts`,
  > `apps/backend/src/modules/auth/client-ip-throttler.guard.spec.ts`, `apps/backend/src/modules/auth/auth.controller.ts`,
  > `apps/backend/src/modules/auth/auth.controller.spec.ts`, `apps/backend/src/modules/auth/auth.module.ts`,
  > `apps/backend/test/auth-email.e2e-spec.ts`, `apps/backend/.env.example`; verified:
  > `npx vitest run src/modules/auth/client-ip-throttler.guard.spec.ts` (4 passed),
  > `npx vitest run --config ./vitest.config.e2e.ts test/auth-email.e2e-spec.ts -t "rate limit"` (5 passed; the
  > two-clients case failed first), `tsc --noEmit` clean; deviations: none.

- [x] **T-03** — Fix `Dockerfile`: build through Turbo so the workspace dependencies compile first, copy each
  workspace's `dist` to the runtime stage, and point `HEALTHCHECK` at `/health`. Skill:
  [`multi-stage-dockerfile`](../../../.claude/skills/multi-stage-dockerfile).
  Covers: ER-03 · Done when: the commands in ER-03's Verify by pass.
  > ✅ 2026-10-30 18:03 — the build now goes through Turbo, the runtime stage copies every workspace's `dist`
  > (`COPY --parents`), and `HEALTHCHECK` calls `/health`; files: `apps/backend/Dockerfile`; verified:
  > `docker build --platform linux/arm64 -f apps/backend/Dockerfile -t rochas-backend .` exit 0 (image arm64, 176 MB);
  > `docker compose up -d` from `apps/backend`, then `docker inspect` on the backend container printed `healthy`, and
  > a request from inside the container to `/health` answered 200 `{"status":"ok"}`;
  > `docker run --rm --entrypoint sh rochas-backend -c 'test ! -e /app/apps/backend/.env'` exit 0, and no `.env*` exists
  > under `/app` outside `node_modules`; deviations: (1) the builder also copies `packages/typescript-config`, because
  > every tsconfig extends it but no workspace declares it, so `turbo prune` drops it (a step missing from the task);
  > (2) compose ran with `PORT=4001`, because the developer's own backend held host port 4000; the container still
  > listened on 4000 inside, and it was stopped after the check.

### Web (`apps/web`)

- [x] **T-04** — Replace the generic hosting line in the policy's services list in
  `src/i18n/dictionaries/{en,pt-br,es}.ts` with Amazon Web Services (runs the app's server), Supabase (runs its
  database) and Vercel (publishes these pages), and add `privacy policy names the hosting providers` per language to
  `e2e/pages.e2e.ts`.
  Covers: ER-12 · Done when: `npm run test:e2e --workspace apps/web` passes.
  > ✅ 2026-10-30 18:06 — the policy's services list now names Amazon Web Services, Supabase and Vercel in the three
  > languages, and the photo storage line is unchanged; files: `apps/web/src/i18n/dictionaries/en.ts`,
  > `apps/web/src/i18n/dictionaries/pt-br.ts`, `apps/web/src/i18n/dictionaries/es.ts`, `apps/web/e2e/pages.e2e.ts`;
  > verified: `npm run test:e2e --workspace apps/web` (77 passed), and the 3 `privacy policy names the hosting providers`
  > tests by name (3 passed); deviations: none.

### Infra (`infra/terraform`)

- [x] **T-05** — Create `infra/terraform/bootstrap`: the S3 state bucket (versioned, encrypted, public access blocked).
  Add the Terraform entries to `.gitignore` (`.terraform/`, `*.tfstate*`, `*.tfvars`), keeping
  `.terraform.lock.hcl` and `*.tfvars.example` committed. Skill: `terraform-style-guide`.
  Covers: enabling · Done when: `terraform -chdir=infra/terraform/bootstrap validate` exits 0 and
  `git check-ignore` confirms a `.tfstate` and a `.tfvars` file are ignored.
  > ✅ 2026-10-30 18:06 — created the bootstrap stack (S3 state bucket: versioned, encrypted, public access blocked,
  > `prevent_destroy`) and the Terraform entries of `.gitignore`; files: `.gitignore`,
  > `infra/terraform/bootstrap/terraform.tf`, `infra/terraform/bootstrap/providers.tf`,
  > `infra/terraform/bootstrap/variables.tf`, `infra/terraform/bootstrap/main.tf`,
  > `infra/terraform/bootstrap/outputs.tf`, `infra/terraform/bootstrap/.terraform.lock.hcl`; verified: `terraform
  > -chdir=infra/terraform/bootstrap validate` exit 0, `terraform fmt -check -recursive infra/terraform` exit 0, `git
  > check-ignore` matched a `.tfstate` and a `.tfvars` path and did not match the lock file or a `.tfvars.example`;
  > deviations: none.

- [ ] **T-06** — Create `infra/terraform/staging` with the S3 backend, then the VPC (two public subnets in two zones,
  no NAT), the security groups, the `t4g.small` server with IMDSv2 and an encrypted root volume, its instance profile
  (SSM core, CloudWatch logs, read `/rochas/staging/*`), the log group, and a `user_data` that installs Docker and the
  deploy script. Add `tests/network.tftest.hcl` with mocked providers. Skills: `terraform-style-guide`,
  `terraform-test`, `launching-ec2-instance-with-best-practices`, `setting-up-ec2-instance-profiles`, `aws-iam`.
  Covers: ER-04, ER-06, ER-11 · Done when: `terraform -chdir=infra/terraform/staging test` passes.

- [ ] **T-07** — Add the HTTP API with its `$default` stage (throttling at 20 requests per second, burst 40) and
  `disable_execute_api_endpoint`, the Cloud Map namespace and service with the server registered on port 4000, the VPC
  link, the integration with the `x-client-ip` mapping of D-06, the ACM certificate, the custom domain and API mapping,
  and outputs with the two CNAMEs to add at Hostinger. Extend the tests. Skills: `terraform-style-guide`,
  `terraform-test`.
  Covers: ER-05 · Done when: `terraform -chdir=infra/terraform/staging test` asserts the mapping, the disabled
  endpoint and the VPC link connection, and passes.

- [ ] **T-08** — Add the Supabase project in `us-east-1` with the `supabase/supabase` provider, with its password
  generated by Terraform and marked sensitive. Skill: `supabase`.
  Covers: enabling · Done when: `terraform -chdir=infra/terraform/staging validate` exits 0 and a test asserts the
  region.

- [ ] **T-09** — Add `.github/workflows/infra.yml`, which runs on pull requests that touch `infra/**`, and checks
  `terraform fmt -check -recursive`, `init -backend=false`, `validate` and `test`, with no secrets.
  Covers: enabling · Done when: the same four commands pass locally and the workflow's YAML parses.

- [ ] **T-10** — Add `.github/workflows/deploy-staging.yml` as in D-11 and D-12, using the `staging` environment: build
  and push the arm64 image tagged by commit, assume the deploy role, migrate, seed with `NODE_ENV=production`, send the
  restart through SSM, and poll `/health`. Add the deploy role and its OIDC trust to the Terraform, with a test on the
  trust condition. Skill: `aws-iam`.
  Covers: ER-07 · Done when: the workflow's YAML parses, `terraform -chdir=infra/terraform/staging test` passes, and a
  failed migration step comes before the restart step in the file.

- [ ] **T-11** — Write `.docs/staging.md`: the accounts and keys needed, the order of the first `apply` (target the
  certificate first, add its CNAME at Hostinger, then apply the rest, because Terraform prints outputs only when it
  finishes), each Parameter Store variable, making the GHCR package public, how to deploy, how to open a session on the
  server, and the VPC link going inactive after 60 days without traffic.
  Covers: enabling · Done when: every variable in `apps/backend/.env.example` that production needs is listed, and
  every command in the guide exists.

- [ ] **T-12** — With the user's accounts: run bootstrap and `apply`, add the CNAMEs, set the parameters and a
  `deploy/staging` push, with `AWS_PROFILE=rochas-surf-school` set, because the machine's default profile is another
  account. The Resend, Anthropic and Google Maps values come from `apps/backend/.env` (D-08). This task stays blocked
  with ⛔ until the user provides a Supabase access token. The project goes in the `rochas-surf-school` organization
  (`kyifpvzdlbiotepohvot`). Pushing the branch needs the user's go-ahead.
  Covers: ER-05, ER-06, ER-07, ER-08, ER-09, ER-10, ER-11 · Done when: every Verify by from ER-05 to ER-11 passes
  against the real stack.

### Verification

- [ ] **T-13** — Run every command in the Verification Plan from the repo root; all pass. Record the output summary as
  evidence, leaving out codes and keys.
  Covers: all · Done when: every automated command exits 0 and each manual check is recorded.

## Verification Plan

- Automated:
  - `node .specs/scripts/run-related-tests.mjs 079` — the tests this spec adds or changes, and the existing tests
    related to its changes, pass (with coverage).
  - `node .specs/scripts/check-coverage.mjs 079` — every line this spec adds or changes is covered.
  - `node .specs/scripts/run-e2e.mjs 079` — the backend and web e2e suites pass, including the health, rate-limit and
    privacy policy tests.
  - `npx turbo run lint check-types build --filter=@rochas-surf-school/backend --filter=@rochas-surf-school/web` — no
    errors.
  - `terraform fmt -check -recursive infra/terraform` — the Terraform is formatted.
  - `terraform -chdir=infra/terraform/staging validate` and `terraform -chdir=infra/terraform/staging test` — the
    configuration is valid and its tests pass.
  - `docker build --platform linux/arm64 -f apps/backend/Dockerfile -t rochas-backend .` — the image builds.
- Manual checks against the real stack, as each Expected Result's Verify by describes:
  - ER-05 and ER-06 from outside AWS.
  - ER-07 on the `deploy/staging` branch.
  - ER-08 with a class 25 minutes ahead.
  - ER-09 with every test account.
  - ER-10 with a real inbox.
  - ER-11 with the AWS CLI.

## Memory Impact

- `memory/technical-context.md` — Deployment: staging's stack, region, secrets and deploy flow, with production still
  undecided; Authentication: how the client IP is read behind the gateway (`CLIENT_IP_HEADER`); External integrations:
  AWS and Supabase as chosen providers; Continuous integration: `infra.yml` and `deploy-staging.yml`; Applications: the
  `/health` route.
- `memory/structure.md` — the `infra/terraform/{bootstrap,staging}` folders and the backend's `health` module.
- `memory/product.md` — the privacy policy names AWS, Supabase and Vercel.

## Assumptions

- The VPC link has no charge of its own. API Gateway's pricing page doesn't list one, but this wasn't confirmed.
- The AWS free plan allows the VPC link, Cloud Map and `t4g.small`. If `apply` is blocked, the account moves to the
  paid plan, where the credits still apply and anything beyond them is billed.
- The free plan's six-month limit and its credits are enough for the test period, about $18 a month.
- Supabase's free plan is enough for staging, and a project that stays in use doesn't pause.
- Node's `pg` driver accepts Supabase's pooler certificate. If it refuses, T-12 adjusts the TLS options in the
  `DATABASE_URL` parameter, with no code change.

## References

- [How to execute](../../shared/how-to-execute.md)
- [Task breakdown](../../shared/task-breakdown.md)
- [Acceptance criteria rules](../../shared/acceptance-criteria.md)
- [Naming rules](../../shared/naming-rules.md)
- [Spec lifecycle](../../shared/spec-lifecycle.md)
- [HTTP API private integrations](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html)
- [VPC links V2](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-vpc-links-v2.html)
- [HTTP API parameter mapping](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-parameter-mapping.html)

## Amendments

- 2026-10-30 — planning — D-08 changed: "real keys" → reuse the values in `apps/backend/.env`. D-14 and ER-10 changed:
  `no-reply@rochassurfschool.com` → `admin@rochassurfschool.com`, the sender in that file. T-12 changed: the AWS account
  and the keys are no longer blockers, and it sets `AWS_PROFILE`. Reason: the user asked to reuse the keys in `.env`
  and created the AWS account. Approved by the user.
- 2026-10-30 — planning — T-12 changed: the Supabase organization is named, so only its access token blocks the task.
  Reason: the user gave the organization. Approved by the user.

## Review
