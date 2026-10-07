// Run with: node --test .specs/scripts/lib/decorator-metadata.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { isDecoratedClassLine, isDecoratorMetadataBranch } from "./decorator-metadata.mjs";

const decorated = [
  "import { Injectable } from '@nestjs/common';",
  "",
  "@Injectable()",
  "export class Foo {",
  "  constructor(private readonly bar: Bar) {}",
  "  run(flag: boolean) { return flag ? 1 : 2; }",
  "}",
].join("\n");

const multiLine = [
  "@Module({",
  "  imports: [A],",
  "  providers: [B],",
  "})",
  "export class FooModule {}",
].join("\n");

const plain = ["const x = 1;", "", "export class Foo {", "}"].join("\n");

const branch = (type, start, end = start) => ({ type, loc: { start: { line: start }, end: { line: end } } });

test("a class decorator, or a class line right below one, belongs to a decorated class", () => {
  assert.equal(isDecoratedClassLine(decorated, 3), true, "the decorator line, where v8 reports it");
  assert.equal(isDecoratedClassLine(decorated, 4), true, "the class line");
  assert.equal(isDecoratedClassLine(multiLine, 1), true);
  assert.equal(isDecoratedClassLine(multiLine, 5), true);
});

test("a decorator that is not on a class is not", () => {
  const method = ["export class Foo {", "  @Get()", "  list() {}", "}"].join("\n");
  const dangling = ["@Injectable()", "", "const x = 1;"].join("\n");
  assert.equal(isDecoratedClassLine(method, 2), false);
  assert.equal(isDecoratedClassLine(dangling, 1), false);
});

test("an undecorated class or a line that is not a class is not", () => {
  assert.equal(isDecoratedClassLine(plain, 3), false);
  assert.equal(isDecoratedClassLine(decorated, 6), false);
  assert.equal(isDecoratedClassLine(decorated, 99), false);
});

test("skips only a one-line cond-expr on a decorated class's decorator or declaration line", () => {
  assert.equal(isDecoratorMetadataBranch(branch("cond-expr", 3), decorated), true);
  assert.equal(isDecoratorMetadataBranch(branch("cond-expr", 4), decorated), true);
});

test("keeps every other branch", () => {
  assert.equal(isDecoratorMetadataBranch(branch("cond-expr", 6), decorated), false, "a real ternary in a method");
  assert.equal(isDecoratorMetadataBranch(branch("if", 4), decorated), false, "not a conditional expression");
  assert.equal(isDecoratorMetadataBranch(branch("cond-expr", 4, 5), decorated), false, "spans several lines");
  assert.equal(isDecoratorMetadataBranch(branch("cond-expr", 3), plain), false, "undecorated class");
  assert.equal(isDecoratorMetadataBranch({ type: "cond-expr" }, decorated), false, "no location");
});
