import { expect, test } from "@playwright/test";

const locales = [
  { path: "pt-br", lang: "pt-BR" },
  { path: "es", lang: "es" },
  { path: "en", lang: "en" },
];
const pages = ["", "/privacy-policy", "/terms-of-use", "/account-deletion"];

for (const { path, lang } of locales) {
  for (const page of pages) {
    test(`/${path}${page} answers 200 in ${lang} with a heading`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(`/${path}${page}`);

      expect(response?.status()).toBe(200);
      await expect(browserPage.locator("html")).toHaveAttribute("lang", lang);
      await expect(browserPage.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
}

const providerLines = {
  "pt-br": /Anthropic \(Claude\): calcula o prazo de cancelamento de cada aula; recebe apenas os detalhes da aula e o texto da regra de cancelamento, nunca dados pessoais\./,
  es: /Anthropic \(Claude\): calcula el plazo de cancelación de cada clase; recibe solo los detalles de la clase y el texto de la regla de cancelación, nunca datos personales\./,
  en: /Anthropic \(Claude\): works out each class's cancellation deadline; receives only the class details and the text of the cancellation rule, never personal data\./,
};
const genericWording = /modelo de linguagem \(IA\)|modelo de lenguaje \(IA\)|language model \(AI\)/;

for (const { path, lang } of locales) {
  test(`privacy policy names Anthropic in ${lang}`, async ({ page }) => {
    await page.goto(`/${path}/privacy-policy`);

    await expect(page.getByText(providerLines[path as keyof typeof providerLines])).toBeVisible();
    await expect(page.getByText(genericWording)).toHaveCount(0);
  });
}

const mapLines = {
  "pt-br": [
    "Google: login com conta Google, Google Maps para mostrar os locais das aulas e sugestões de endereço quando administradores salvam um local (recebe o texto da busca).",
    "Apple: login com conta Apple e Apple Maps para mostrar os locais das aulas no iPhone.",
  ],
  es: [
    "Google: inicio de sesión con una cuenta de Google, Google Maps para mostrar los lugares de las clases y sugerencias de dirección cuando los administradores guardan un lugar (recibe el texto de la búsqueda).",
    "Apple: inicio de sesión con una cuenta de Apple y Apple Maps para mostrar los lugares de las clases en iPhone.",
  ],
  en: [
    "Google: sign-in with a Google account, Google Maps to show class locations, and address suggestions when admins save a location (receives the search text).",
    "Apple: sign-in with an Apple account, and Apple Maps to show class locations on iPhone.",
  ],
};

for (const { path, lang } of locales) {
  test(`privacy policy names the map providers in ${lang}`, async ({ page }) => {
    await page.goto(`/${path}/privacy-policy`);

    for (const line of mapLines[path as keyof typeof mapLines]) {
      await expect(page.getByText(line, { exact: true })).toBeVisible();
    }
  });
}

const hostLines = {
  "pt-br": [
    "Amazon Web Services: roda o servidor do app.",
    "Supabase: roda o banco de dados do app.",
    "Vercel: publica estas páginas.",
  ],
  es: [
    "Amazon Web Services: ejecuta el servidor de la app.",
    "Supabase: ejecuta la base de datos de la app.",
    "Vercel: publica estas páginas.",
  ],
  en: [
    "Amazon Web Services: runs the app's server.",
    "Supabase: runs the app's database.",
    "Vercel: publishes these web pages.",
  ],
};
const genericHosting = /hospedagem na nuvem|alojamiento en la nube|cloud hosting/;
const photoStorage = {
  "pt-br": "Um serviço de armazenamento de fotos compatível com S3, onde ficam as fotos das aulas.",
  es: "Un servicio de almacenamiento de fotos compatible con S3, donde se guardan las fotos de las clases.",
  en: "An S3-compatible photo storage service, where class photos are kept.",
};

for (const { path, lang } of locales) {
  test(`privacy policy names the hosting providers in ${lang}`, async ({ page }) => {
    await page.goto(`/${path}/privacy-policy`);

    for (const line of hostLines[path as keyof typeof hostLines]) {
      await expect(page.getByText(line, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(genericHosting)).toHaveCount(0);
    await expect(page.getByText(photoStorage[path as keyof typeof photoStorage], { exact: true })).toBeVisible();
  });
}
