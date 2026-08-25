import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const runtime=JSON.parse(fs.readFileSync(path.join(root,"data/runtime.json"),"utf8"));

function normalize(value=""){
  return String(value??"").normalize("NFKC").toLowerCase().replace(/[，。；：、,.!?！？「」『』（）()【】《》〈〉]/g," ").replace(/\s+/g," ").trim();
}

test("鑑定查詢不會把刑法第1、2條當成命中條文",()=>{
  const term="鑑定";
  const matches=Object.values(runtime.frontend.articleTexts).filter(row=>normalize(`${row.lawName} 第${row.article}條 ${row.text}`).includes(term));
  assert.ok(matches.length>0);
  assert.equal(matches.some(row=>row.lawId==="criminal"&&["1","2"].includes(String(row.article))),false);
  assert.ok(matches.every(row=>normalize(`${row.lawName} 第${row.article}條 ${row.text}`).includes(term)));
});

test("複合查詢採全詞命中而不是任一詞命中",()=>{
  const terms=["鑑定","通譯"];
  const rows=Object.values(runtime.frontend.articleTexts);
  const allTerms=rows.filter(row=>terms.every(term=>normalize(`${row.lawName} 第${row.article}條 ${row.text}`).includes(term)));
  const onlyOne=rows.filter(row=>terms.some(term=>normalize(`${row.lawName} 第${row.article}條 ${row.text}`).includes(term))&&!terms.every(term=>normalize(`${row.lawName} 第${row.article}條 ${row.text}`).includes(term)));
  assert.ok(allTerms.length>0);
  assert.ok(onlyOne.length>0);
  assert.ok(allTerms.every(row=>terms.every(term=>normalize(`${row.lawName} 第${row.article}條 ${row.text}`).includes(term))));
});
