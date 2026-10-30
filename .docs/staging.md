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
| `REVIEW_ACCOUNTS`               | The first thing `npm run test-accounts --workspace apps/backend` prints. Keep its table safe.   |
| `GOOGLE_WEB_CLIENT_ID`          | From `apps/backend/.env.example`; it isn't secret.                                              |
| `ANTHROPIC_API_KEY`             | From `apps/backend/.env`.                                                                       |
| `GOOGLE_MAPS_API_KEY`           | From `apps/backend/.env`.                                                                       |
| `EXPO_ACCESS_TOKEN`             | Optional: only with "enhanced push security" on in Expo. Leave it out otherwise.                |

`PORT` and `NODE_ENV` come from the image, and the deploy script sets `CLIENT_IP_HEADER`, so none of them is a
parameter. `REVIEW_ACCOUNTS` is about 4,030 bytes and the standard tier's limit is 4 KB, so adding accounts may not fit.

**`DATABASE_URL`.** The server has no IPv6, so it can't use Supabase's direct connection. Use the session pooler
(port 5432): copy the string from **Connect → Session pooler** in the Supabase dashboard, because its host can't be
worked out from the region. Fill in the password from this output, which is sensitive, so don't paste it anywhere else.

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

The image goes to `ghcr.io/steniowagner/rochas-surf-school-backend` and the server pulls it without credentials, so
the package must be public. It only exists after the first publish, so the first deploy fails at the restart: make the
package public in its GitHub settings (**Package settings → Change visibility**), then run the deploy again.

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
