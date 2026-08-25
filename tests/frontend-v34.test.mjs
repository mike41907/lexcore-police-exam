import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

test("v3.4.0 lookup UI keeps strict matching and safe result highlighting",()=>{
  assert.match(html,/id="lookupMatchMode"/);
  assert.match(html,/id="lookupClear"/);
  assert.match(html,/id="lookupHistory"/);
  assert.match(html,/const LOOKUP_HISTORY_KEY="lexcore-lookup-history-v1"/);
  assert.match(html,/function highlightLookupText\(value="",terms=\[\]\)/);
  assert.match(html,/mode!=="phrase"&&matchedTerms\.length!==terms\.length/);
  assert.match(html,/lookup-hit/);
});

test("sync page exposes read-only runtime health checks",()=>{
  assert.match(html,/id="syncHealthGrid"/);
  assert.match(html,/id="syncHealthReload"/);
  assert.match(html,/function syncHealthSnapshot\(\)/);
  assert.match(html,/function renderSyncHealth\(\)/);
  assert.match(html,/sourceArticleCount!==records\.length/);
  assert.match(html,/不會清除或覆蓋既有學習資料/);
});
