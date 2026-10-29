import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { messages } from "@rochas-surf-school/app-messages";

import { appRich, appT } from "./app-t";

describe("appT", () => {
  it("reads a dotted key in the language of the page", () => {
    expect(appT("pt-br", "common.cancel")).toBe(messages["pt-BR"].common.cancel);
    expect(appT("es", "common.cancel")).toBe(messages["es-ES"].common.cancel);
    expect(appT("en", "common.cancel")).toBe("Cancel");
  });

  it("reads the retry label of the error state", () => {
    expect(appT("pt-br", "common.tryAgain")).toBe("Tentar de novo");
    expect(appT("en", "common.tryAgain")).toBe("Try again");
  });

  it("fills {{name}} values", () => {
    expect(appT("en", "confirmCode.description", { email: "a@b.com" })).toContain("<bold>a@b.com</bold>");
  });

  it("picks the plural form from count", () => {
    expect(appT("en", "removedAccounts.count", { count: 1 })).toBe("1 can be restored");
    expect(appT("en", "removedAccounts.count", { count: 3 })).toBe("3 can be restored");
  });

  it("throws on a missing key", () => {
    expect(() => appT("en", "nope.missing")).toThrow('Missing app message "nope.missing" for en');
  });
});

describe("appRich", () => {
  it("renders tags through the given components and keeps the plain text", () => {
    const node = appRich("en", "emailSignIn.noAccount", { create: (children) => createElement("b", null, children) });
    expect(renderToStaticMarkup(createElement("p", null, node))).toBe("<p>Don&#x27;t have an account? <b>Create account</b></p>");
  });

  it("keeps the text of a tag with no component and fills values", () => {
    const node = appRich("en", "emailSignIn.noAccount", {});
    expect(renderToStaticMarkup(createElement("p", null, node))).not.toContain("<create>");
  });
});
