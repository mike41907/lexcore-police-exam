import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const official=JSON.parse(fs.readFileSync(path.join(root,"data/official/court.json"),"utf8"));
const runtime=JSON.parse(fs.readFileSync(path.join(root,"data/runtime.json"),"utf8"));

test("constitutional judgment snapshot retains all 111-year cases and dates",()=>{
  const cases=official.cases.filter(x=>x.year===111);
  assert.equal(cases.length,20);
  assert.ok(cases.every(x=>x.date&&x.date.startsWith("2022-")));
});

test("runtime exposes 111-year judgments to the frontend",()=>{
  const cases=runtime.frontend.data.court.filter(x=>x.no.startsWith("111年"));
  assert.equal(cases.length,20);
  assert.ok(cases.every(x=>x.date.startsWith("111/")));
});

test("court year filter falls back to the judgment number year",()=>{
  assert.match(html,/function courtRocYear\(c=\{\}\)/);
  assert.match(html,/!y\\|\\|courtRocYear\(c\)===String\(y\)/);
  assert.match(html,/function courtDateLabel\(c=\{\}\)/);
});

test("court sync parses ROC and Gregorian judgment dates",()=>{
  const source=fs.readFileSync(path.join(root,"scripts/sync-court.mjs"),"utf8");
  assert.match(source,/function parseCourtDate\(text=""\)/);
  assert.match(source,/const roc=value\.match/);
  assert.match(source,/c\.date=parseCourtDate\(text\)\|\|c\.date/);
});
