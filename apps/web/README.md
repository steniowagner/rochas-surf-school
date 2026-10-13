# Rocha's Surf School — public web pages

The only web surface of the product: the pages the App Store and Google Play require, each in Brazilian
Portuguese, Spanish and English. No sign-in, no private area and no API calls.

## What it serves

| URL | Page |
| --- | --- |
| `/{lang}` | Home, with links to both pages |
| `/{lang}/privacy-policy` | Privacy policy |
| `/{lang}/account-deletion` | How to delete an account, with the school's WhatsApp number |

`lang` is `pt-br`, `es` or `en`; any other value answers 404. `/`, `/privacy-policy` and `/account-deletion`
redirect (307) to the same path under the language picked from the browser's `Accept-Language`, falling back to
`pt-br` (`src/proxy.ts`). Copy lives in typed dictionaries in `src/i18n/dictionaries/`.

## Configuration

All variables are server-only and read at build time: `next build` fails, naming the variable, when a required
one is missing or invalid. Copy `.env.example` to `.env`.

| Variable | Required | What |
| --- | --- | --- |
| `SCHOOL_WHATSAPP_NUMBER` | yes | The school's WhatsApp number in E.164 (e.g. `+5585999999999`) |
| `SCHOOL_LEGAL_NAME` | yes | The school's legal name, shown as the controller in the privacy policy |
| `SCHOOL_CNPJ` | no | The CNPJ (14 digits, `.` `/` `-` allowed, check digits validated); shown as `00.000.000/0000-00`. Unset or empty: no CNPJ line |
| `DPO_NAME` | yes | Name of the data protection contact (encarregado) |
| `DPO_EMAIL` | yes | Email of the encarregado, shown as a `mailto:` link |

## Run

From the repo root:

```bash
npm run dev -w @rochas-surf-school/web      # http://localhost:3000
```

Production build (needs a Node runtime because of the proxy; static export is not used):

```bash
npm run build -w @rochas-surf-school/web
npm run start -w @rochas-surf-school/web
```
