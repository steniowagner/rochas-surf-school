# Staging

How the staging API at `https://api-staging.rochassurfschool.com` is created, configured and deployed (spec 079). It
is a testing environment: small, cheap, and with nothing decided about production.

- **Server:** one `t4g.small` EC2 in `us-east-1` running one Docker container, with no inbound access from the
  internet. Traffic goes API Gateway → VPC link → Cloud Map → port 4000.
- **Database:** a Supabase project in `us-east-1`, reached through its session pooler.
- **Infrastructure:** Terraform in `infra/terraform`, applied from the developer's machine.
- **Secrets:** SSM Parameter Store under `/rochas/staging/`, set by hand. The repo is public, so nothing secret goes
  in it.

## What you need

- An AWS account, with its CLI profile. Every command here assumes `export AWS_PROFILE=rochas-surf-school`, because
  the machine's default profile is another account.
- A Supabase access token that can create projects in the `rochas-surf-school` organization
  (`kyifpvzdlbiotepohvot`), exported as `SUPABASE_ACCESS_TOKEN`.
- DNS access to `rochassurfschool.com` at Hostinger.
- `terraform`, `aws`, `gh`, and the
  [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
  to open a session on the server.
- The Resend, Anthropic and Google Maps keys in `apps/backend/.env`, which staging reuses. Set a spending limit on the
  Anthropic key in its console.

## First apply

The two CNAMEs depend on each other's step: the certificate needs its CNAME before the custom domain can be created,
and Terraform prints outputs only when it finishes. So the certificate goes first.

1. Create the state bucket. Its own state stays on your machine, in `infra/terraform/bootstrap`.

   ```bash
   terraform -chdir=infra/terraform/bootstrap init
   ```

   ```bash
   terraform -chdir=infra/terraform/bootstrap apply
   ```

2. Create the certificate.

   ```bash
   terraform -chdir=infra/terraform/staging init
   ```

   ```bash
   terraform -chdir=infra/terraform/staging apply -target=aws_acm_certificate.api
   ```

3. Read the validation record and add it at Hostinger as a CNAME. Hostinger wants the name without
   `.rochassurfschool.com.`.

   ```bash
   terraform -chdir=infra/terraform/staging state show aws_acm_certificate.api
   ```

4. Apply the rest. It waits at `aws_acm_certificate_validation.api` until ACM sees the record.

   ```bash
   terraform -chdir=infra/terraform/staging apply
   ```

5. Add the API's CNAME at Hostinger, with the name and value from this output.

   ```bash
   terraform -chdir=infra/terraform/staging output api_cname
   ```

If `apply` is refused because the account is on AWS's free plan, move the account to the paid plan: the credits still
apply, and anything beyond them is billed.

## Parameters

Each variable is one `SecureString` under `/rochas/staging/`. The server reads them all at every deploy, so a change
reaches it on the next deploy. Terraform never sets them.

```bash
aws ssm put-parameter --region us-east-1 --type SecureString --overwrite --name /rochas/staging/JWT_EXPIRES_IN --value 15m
```

| Parameter                       | Value                                                                                           |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | The session pooler string, see below. It replaces the `DATABASE_*` variables of `.env.example`. |
| `JWT_SECRET`                    | New, from `openssl rand -hex 32`. Don't reuse the local one.                                    |
| `JWT_EXPIRES_IN`                | `15m`                                                                                           |
| `AUTH_CODE_PEPPER`              | New, from `openssl rand -hex 32`. Don't reuse the local one.                                    |
| `REFRESH_TOKEN_EXPIRES_IN_DAYS` | `30`                                                                                            |
| `RESEND_API_KEY`                | From `apps/backend/.env`.                                                                       |
| `EMAIL_FROM`                    | From `apps/backend/.env`: `admin@rochassurfschool.com`.                                         |
| `REVIEW_ACCOUNTS`               | The first line of `npm run test-accounts -w apps/backend`.                                      |
| `GOOGLE_WEB_CLIENT_ID`          | From `apps/backend/.env.example`; it isn't secret.                                              |
| `APPLE_CLIENT_ID`               | `com.rochassurfschool.app`, the app's bundle id; it isn't secret.                               |
| `ANTHROPIC_API_KEY`             | From `apps/backend/.env`.                                                                       |
| `GOOGLE_MAPS_API_KEY`           | From `apps/backend/.env`.                                                                       |
| `EXPO_ACCESS_TOKEN`             | Optional: only with "enhanced push security" on in Expo. Leave it out otherwise.                |

`PORT` and `NODE_ENV` come from the image, and the deploy script sets `CLIENT_IP_HEADER`, so none of them is a
parameter. `REVIEW_ACCOUNTS` is about 3,980 bytes and the standard tier's limit is 4 KB, so adding accounts may not fit.

**`DATABASE_URL`.** The server has no IPv6, so it can't use Supabase's direct connection. Use the session pooler
(port 5432): copy the string from **Connect → Session pooler** in the Supabase dashboard, because its host can't be
worked out from the region. Fill in the password from this output, which is sensitive, so don't paste it anywhere else.
Then add `?sslmode=require&uselibpqcompat=true` to the end. Without it the connection isn't encrypted, and with
`sslmode=require` alone the `pg` driver refuses Supabase's certificate (`SELF_SIGNED_CERT_IN_CHAIN`). This setting
encrypts the connection without verifying the certificate, and both `pg` and Prisma's migrations accept it.

```bash
terraform -chdir=infra/terraform/staging output -raw database_password
```

## GitHub

The deploy runs in the `staging` environment and reads two plain variables from it.

```bash
gh api -X PUT repos/steniowagner/rochas-surf-school/environments/staging
```

```bash
gh variable set AWS_DEPLOY_ROLE_ARN --env staging --body "$(terraform -chdir=infra/terraform/staging output -raw deploy_role_arn)"
```

```bash
gh variable set STAGING_INSTANCE_ID --env staging --body "$(terraform -chdir=infra/terraform/staging output -raw server_instance_id)"
```

The image goes to `ghcr.io/steniowagner/rochas-surf-school-backend` and the server pulls it without credentials. The
package came out public on its first publish, because the repo is public. If a pull is ever denied, check **Package
settings → Change visibility**.

The deploy role trusts this repo's `staging` environment by its OIDC subject. The repo uses GitHub's immutable subject
format, with numeric IDs, so `github_subject_prefix` in the Terraform must match what this prints:

```bash
gh api repos/steniowagner/rochas-surf-school/actions/oidc/customization/sub
```

## Deploy

A deploy is manual. It publishes the image, applies the migrations, seeds the test accounts, restarts the server and
fails unless `/health` answers within 2 minutes. A failed migration stops it before the restart, so the running
version keeps answering.

From `main`:

```bash
gh workflow run deploy-staging.yml
```

From any other commit, before the workflow is on `main` or to try a branch:

```bash
git push --force origin HEAD:deploy/staging
```

If a migration fails, Prisma records it and refuses every later migration until that's cleared. Fix the migration, then
mark the failed one as rolled back, with `DATABASE_URL` set to the staging value:

```bash
npx prisma migrate resolve --rolled-back <migration-name>
```

## Operating it

Check the API:

```bash
curl -si https://api-staging.rochassurfschool.com/health
```

Read the container's logs, kept 14 days:

```bash
aws logs tail /rochas/staging/backend --since 10m --region us-east-1
```

Open a session on the server. Port 22 is closed and there is no SSH key.

```bash
aws ssm start-session --region us-east-1 --target "$(terraform -chdir=infra/terraform/staging output -raw server_instance_id)"
```

Replacing the server (a new `user_data`, say) leaves it without the backend until the next deploy, because the running
version isn't part of the Terraform.

**After 60 days without traffic** the VPC link goes `INACTIVE` and API Gateway deletes its network interfaces, so the
API fails. Any request starts bringing it back, and it answers again a few minutes later.

## Resetting the data

`npm run reset-staging` erases everything in the database and leaves only the test accounts in `REVIEW_ACCOUNTS`: the 12
sets of `admin01@test.com`, `instructor01@test.com` and `student01@test.com`, up to `12`. The admins start approved and
everyone else starts as a pending student, whatever their name says, so testers approve them and set their roles. The
migrations stay applied. Refresh tokens go too, so everyone is signed out, and real accounts on staging go with the rest,
including your own. A deploy never runs it, and it leaves accounts that testers have changed alone.

The accounts come from the `REVIEW_ACCOUNTS` parameter, which `test-accounts` builds from `testAccountSets` and
`testAccountCode` in `packages/shared`. The web's test accounts page shows that same list and code, so anyone with the
page can sign in as a staging admin: never put these accounts on a production server. If the emails you get are the old
ones, the parameter wasn't updated. Steps 2 and 3 are only needed when the accounts or the code change. Run everything
from `apps/backend`.

1. Select the staging AWS profile. The machine's default profile is another account, where these parameters don't
   exist, so the `aws` commands would fail or come back empty.

   ```bash
   export AWS_PROFILE=rochas-surf-school
   ```

2. Generate the value and keep it in this shell.

   ```bash
   export REVIEW_ACCOUNTS="$(npm run -s test-accounts | head -1 | sed -e "s/^REVIEW_ACCOUNTS='//" -e "s/'$//")"
   ```

3. Save it to staging. If you paste the JSON instead of using the variable, wrap it in single quotes and leave out the
   `REVIEW_ACCOUNTS=` prefix. The command prints the parameter's new `Version`.

   ```bash
   aws ssm put-parameter --region us-east-1 --type SecureString --overwrite --name /rochas/staging/REVIEW_ACCOUNTS --value "$REVIEW_ACCOUNTS"
   ```

4. Load the staging database. If you skipped steps 2 and 3, load the accounts as well. Both variables have to be in this
   shell: without them the script reads `apps/backend/.env`, which points at your local database and holds your local
   review accounts.

   ```bash
   export DATABASE_URL="$(aws ssm get-parameter --region us-east-1 --name /rochas/staging/DATABASE_URL --with-decryption --query Parameter.Value --output text)"
   ```

   ```bash
   export REVIEW_ACCOUNTS="$(aws ssm get-parameter --region us-east-1 --name /rochas/staging/REVIEW_ACCOUNTS --with-decryption --query Parameter.Value --output text)"
   ```

5. Check the accounts it will seed. This should print `36 admin01@test.com`.

   ```bash
   node -e 'const a = JSON.parse(process.env.REVIEW_ACCOUNTS); console.log(a.length, a[0].email)'
   ```

6. Run it without an argument. It erases nothing and prints the host it would erase, which is the session pooler's, for
   example `aws-0-us-east-1.pooler.supabase.com`.

   ```bash
   npm run reset-staging
   ```

7. Run it again with that host to confirm. Pass only the host, not the whole `DATABASE_URL`. It prints how many accounts
   it seeded.

   ```bash
   npm run reset-staging -- <database host>
   ```

8. If you changed the parameter, deploy, as in [Deploy](#deploy). The server reads `REVIEW_ACCOUNTS` only when it starts,
   so until then the new accounts' code is refused.
