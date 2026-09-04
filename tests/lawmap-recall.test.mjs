import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {test} from "node:test";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const lawMap=JSON.parse(fs.readFileSync(path.join(root,"data/lawmap/lu-criminal-procedure-116.json"),"utf8"));
const runtime=JSON.parse(fs.readFileSync(path.join(root,"data/runtime.json"),"utf8"));

test("embedded criminal-procedure law map keeps the supplied source content",()=>{
  assert.equal(lawMap.law.id,"cpl");
  assert.equal(lawMap.stats.itemCount,752);
  assert.equal(lawMap.stats.chapterCount,11);
  assert.equal(lawMap.stats.sectionCount,82);
  assert.equal(lawMap.stats.categoryCounts["刑訴"],588);
  assert.equal(lawMap.stats.categoryCounts["釋字"],27);
  assert.equal(lawMap.stats.categoryCounts["憲判"],8);
  assert.equal(lawMap.items.length,lawMap.stats.itemCount);
  assert.ok(lawMap.items.every(item=>item.content&&item.sourceUrl));
  assert.ok(lawMap.items.some(item=>item.kind==="interpretation"&&item.articleNo==="釋字388"));
});

test("runtime exposes the embedded law map without replacing official article data",()=>{
  assert.equal(runtime.frontend.lawMap.stats.itemCount,752);
  assert.ok(runtime.frontend.articleTexts["cpl:1"]?.text);
  assert.ok(runtime.frontend.lawMap.items.some(item=>item.kind==="constitutional-judgment"));
});

test("active recall requires an answer before reveal and three passes for mastery",()=>{
  assert.match(html,/const LAW_MAP_RECALL_STATE_KEY="lexcore-lawmap-recall-state-v1"/);
  assert.match(html,/function submitLawMapRecall\(\)/);
  assert.match(html,/value\.replace\(\/\\s\/g,""\)\.length<6/);
  assert.match(html,/function rateLawMapFlashcard\(rating\)/);
  assert.match(html,/rating==="mastered"&&checks<2/);
  assert.match(html,/Math\.round\(goodStreak\/3\*100\)/);
  assert.match(html,/先輸入回想再揭曉/);
  assert.match(html,/只有連續3次主動回想/);
});

test("existing personal study keys and flashcard progress remain separate",()=>{
  assert.match(html,/const FLASHCARD_STATE_KEY="lexcore-flashcard-state-v1"/);
  assert.match(html,/const FLASHCARD_PDF_STATE_KEY="lexcore-pdf-flashcard-state-v1"/);
  assert.match(html,/const LAW_MAP_RECALL_STATE_KEY="lexcore-lawmap-recall-state-v1"/);
  assert.match(html,/lexcore-spaced-review-v20/);
  assert.match(html,/lexcore-study-calendar-v28/);
});
