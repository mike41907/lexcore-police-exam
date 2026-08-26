import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const runtime=JSON.parse(fs.readFileSync(path.join(root,"data/runtime.json"),"utf8"));

function deletedMarker(value=""){
  const text=String(value??"").replace(/\s+/g,"").trim();
  return /^(?:[（(]?刪除[）)]?|已刪除)$/u.test(text);
}

test("runtime keeps deleted source markers available for historical checks",()=>{
  const deleted=Object.entries(runtime.frontend.articleTexts||{}).filter(([,record])=>deletedMarker(record?.text));
  assert.ok(deleted.length>=50,`expected at least 50 deleted markers, got ${deleted.length}`);
  assert.equal(runtime.frontend.mnemonics?.["criminal:34"]?.kind,"deleted");
});

test("current law UI filters deleted articles before rendering or navigation",()=>{
  assert.match(html,/function isDeletedArticleMarker\(value=""\)/);
  assert.match(html,/function isDeletedArticleKey\(key,record=null\)/);
  assert.match(html,/Object\.values\(ARTICLE_TEXTS\|\|\{\}\)\.filter\(rec=>!isDeletedArticleKey/);
  assert.match(html,/articleIdsForLaw\(id\).*filter\(a=>!isDeletedArticleKey/s);
  assert.match(html,/const visibleIds=ids\.filter\(a=>!isDeletedArticleKey/);
  assert.match(html,/const visibleRecords=records\.filter\(r=>!isDeletedArticleKey/);
  assert.match(html,/if\(isDeletedArticleKey\(key\)\)\{/);
  assert.match(html,/function allQuestions\(\{includeDeleted=false\}=\{\}\)/);
  assert.match(html,/includeDeleted\?rows:rows\.filter\(q=>!\(q\.lawId&&q\.article&&isDeletedArticleKey/);
  assert.match(html,/allQuestions\(\{includeDeleted:true\}\)/);
  assert.match(html,/masteryRows\(\)\.filter\(x=>!isDeletedArticleKey/);
  assert.match(html,/現行條文已刪除/);
});
