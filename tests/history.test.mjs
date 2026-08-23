import test from "node:test";
import assert from "node:assert/strict";
import {parseOfficialHistoryText} from "../scripts/lib/history.mjs";

test("parses Chinese ROC date amendment items",()=>{
  const text=`
58. 中華民國一百十五年七月二十二日總統華總一義字第 11500067801 號令修正公布第 80 條條文
57. 中華民國一百十五年三月十三日總統華總一義字第 11500025171 號令修正公布第 79-1 條條文；增訂第 78-1、78-2 條條文；並自一百十五年三月十四日施行
56. 中華民國一百十四年八月一日總統華總一義字第 11400076421 號令修正公布第 286 條條文；增訂第 272-1 條條文
`;
  const rows=parseOfficialHistoryText(text);
  assert.equal(rows.length,3);
  assert.equal(rows[0].rocDate,"115/07/22");
  assert.deepEqual(rows[0].articles,["80"]);
  assert.equal(rows[1].rocDate,"115/03/13");
  assert.deepEqual(rows[1].articles,["79-1","78-1","78-2"]);
});

test("does not split an effective date inside one history item",()=>{
  const text=`
4.中華民國一百十二年六月二十一日總統華總一義字第 11200051211 號令修正公布第 1、33、53、59、63、95 條條文；依第 95 條規定：施行日期，由司法院以命令定之 中華民國一百十二年七月三日司法院院台廳書一字第 11206006751 號令發布定自一百十二年七月七日施行
3.中華民國一百零八年一月四日總統華總一義字第 10800001301 號令修正公布名稱及全文 95 條
`;
  const rows=parseOfficialHistoryText(text);
  assert.equal(rows.length,2);
  assert.equal(rows[0].rocDate,"112/06/21");
  assert.deepEqual(rows[0].articles,["1","33","53","59","63","95"]);
});

test("keeps two separate promulgation orders on same date when they are separate numbered items",()=>{
  const text=`
52. 中華民國一百十二年十二月二十七日總統令修正公布第 257、258 條
51. 中華民國一百十二年十二月十五日總統甲號令修正公布第 27、31 條；增訂第 298-1 條
50. 中華民國一百十二年十二月十五日總統乙號令修正公布第 198、206、208 條；增訂第 198-1、198-2、211-1 條
`;
  const rows=parseOfficialHistoryText(text);
  assert.equal(rows.length,3);
  assert.equal(rows[1].rocDate,"112/12/15");
  assert.equal(rows[2].rocDate,"112/12/15");
});
