import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {splitReasonPoints} from "../scripts/lib/reasons.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const manual=JSON.parse(fs.readFileSync(path.join(root,"data/manual-article-details.json"),"utf8"));
const runtime=JSON.parse(fs.readFileSync(path.join(root,"data/runtime.json"),"utf8"));

test("legislative reasons are split into readable sentence points",()=>{
  const points=splitReasonPoints("第一句說明目的。第二句補充背景；第三句說明效果！");
  assert.deepEqual(points,["第一句說明目的。","第二句補充背景；","第三句說明效果！"]);
});

test("manual article reasons keep source text and expose runtime bullet points",()=>{
  const entries=Object.entries(manual).filter(([,detail])=>detail?.reason);
  assert.ok(entries.length>0);
  for(const [key,detail] of entries){
    const points=runtime.frontend.details[key]?.reason_points;
    assert.ok(Array.isArray(points)&&points.length>0,`${key} 缺少 reason_points`);
    assert.ok(points.every(point=>typeof point==="string"&&point.trim()),`${key} 條列必須是非空字串`);
    assert.ok(!points.some(point=>point.includes("[object Object]")),`${key} 不得出現物件字串`);
    assert.equal(runtime.frontend.details[key].reason,detail.reason,`${key} 不得改寫原始理由`);
  }
});
