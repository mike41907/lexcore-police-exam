import test from "node:test";
import assert from "node:assert/strict";
import {parseAllArticlesFromText,parseLawAllStructure} from "../scripts/lib/law-all.mjs";

test("parse all current articles from LawAll-like text",()=>{
 const text=`所有條文
法規名稱：警察職權行使法
第 一 章 總則
第 1 條
為規範警察依法行使職權，特制定本法。
第 2 條
本法所稱警察，係指警察機關與警察人員之總稱。
第 10-1 條
這是一條之一次條文。
第 11 條
最後一條測試內容。
授權子法
沿革`;
 const x=parseAllArticlesFromText(text);
 assert.equal(x["1"],"為規範警察依法行使職權，特制定本法。");
 assert.match(x["2"],/本法所稱警察/);
 assert.equal(x["10-1"],"這是一條之一次條文。");
 assert.equal(x["11"],"最後一條測試內容。");
});

test("keeps chapter headings out of article text and exposes chapter jump points",()=>{
 const text=`第 一 編 總則
第 一 章 法例
第 1 條
第一條內容。
第 2 條
第二條內容。
第 二 章 刑事責任
第 3 條
第三條內容。
第 二 編 分則
第 4 條
第四條內容。`;
 const parsed=parseLawAllStructure(text);
 assert.equal(parsed.articles["2"],"第二條內容。");
 assert.equal(parsed.articles["3"],"第三條內容。");
 assert.deepEqual(parsed.chapters.map(x=>[x.type,x.label,x.article]),[
  ["編","第一編 總則","1"],
  ["章","第一章 法例","1"],
  ["章","第二章 刑事責任","3"],
  ["編","第二編 分則","4"]
 ]);
});
