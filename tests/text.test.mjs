import test from "node:test";
import assert from "node:assert/strict";
import {extractArticleNumbers,parseArticleNo,chineseNumber,sessionTermsForRoc} from "../scripts/lib/text.mjs";

test("expand amendment article ranges",()=>{
  assert.deepEqual(extractArticleNumbers("修正第 1、4、11 條；增訂第 10-1～10-3 條；刪除第 12 條"),
    ["1","4","11","10-1","10-2","10-3","12"]);
});
test("parse Chinese article heading",()=>{
  assert.equal(parseArticleNo("刑事訴訟法第一百零一條之一修正條文"),"101-1");
  assert.equal(chineseNumber("三百四十八"),348);
});
test("recent legislative sessions",()=>{
  assert.deepEqual(sessionTermsForRoc(115),["1105","1106"]);
});
