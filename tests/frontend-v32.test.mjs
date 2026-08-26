import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");

test("v3.5.5 release markers and cache version stay synchronized",()=>{
  assert.equal(pkg.version,"3.5.5");
  assert.match(html,/目前 v3\.5\.5/);
  assert.match(html,/release-version">v3\.5\.5/);
  assert.match(sw,/lexcore-v3\.5\.5/);
});

test("law reader keeps navigation state and defers heavy article extras",()=>{
  assert.match(html,/id="lawReadingShortcuts"/);
  assert.match(html,/const LAW_READING_STATE_KEY="lexcore-law-reading-v1"/);
  assert.match(html,/data-lazy-extras="1"/);
  assert.match(html,/function setupLawArticleExtras\(\)/);
  assert.match(html,/function setupLawReadingPositionObserver\(\)/);
  assert.match(html,/data-lazy-text="1"/);
  assert.match(html,/lawReaderTextMarkup\(text\)/);
});

test("law reader exposes per-article legislative-reason controls",()=>{
  assert.match(html,/function reasonPoints\(d=\{\}\)/);
  assert.match(html,/function reasonListMarkup\(d=\{\},options=\{\}\)/);
  assert.match(html,/function toggleArticleReason\(lid,article,button\)/);
  assert.match(html,/law-reason-inline-btn/);
  assert.match(html,/law-article-reason/);
  assert.match(html,/reason_points/);
  assert.match(html,/class="law-reason-list"/);
});

test("law reader hides unavailable legislative-reason controls",()=>{
  const button=html.slice(html.indexOf("function articleReasonButtonMarkup"),html.indexOf("function articleReasonPanelMarkup"));
  const panel=html.slice(html.indexOf("function articleReasonPanelMarkup"),html.indexOf("function toggleArticleReason"));
  assert.match(button,/if\(!hasArticleReason\(d\)\)return ""/);
  assert.doesNotMatch(button,/立法理由（待配對）/);
  assert.match(panel,/if\(!hasArticleReason\(d\)\)return ""/);
  assert.doesNotMatch(panel,/尚未配對/);
  assert.match(html,/const reasonMarkup=reasonListMarkup\(d\)/);
  assert.match(html,/\$\{reasonMarkup\?`<div class="block">\$\{reasonMarkup\}<\/div>`:""\}/);
});

test("quick lookup requires every query term and clears stale results",()=>{
  assert.match(html,/function normalizeLookupText\(value=""\)/);
  assert.match(html,/function lookupQueryTerms\(query=""\)/);
  assert.match(html,/function lookupRecordMatch\(record,query,terms(?:,mode="all")?\)/);
  assert.match(html,/matchedTerms\.length!==terms\.length/);
  assert.match(html,/let rows=\[\.\.\.allArticleRecords\(\)\]/);
  assert.match(html,/lookupResults"\)\.innerHTML=.*可以直接用工作語言搜尋/);
  assert.match(html,/命中「\$\{esc\(r\.matchTerms\.join\("、"\)\)\}」/);
});

test("mnemonic editing and flashcards have separate local data channels",()=>{
  assert.match(html,/const MNEMONIC_EDIT_KEY="lexcore-mnemonic-edits-v1"/);
  assert.match(html,/const FLASHCARD_STATE_KEY="lexcore-flashcard-state-v1"/);
  assert.match(html,/function openMnemonicEditor\(lid,article\)/);
  assert.match(html,/function saveMnemonicEditor\(\)/);
  assert.match(html,/function startFlashcards\(mode="due",preferredKey=""\)/);
  assert.match(html,/id="startFlashcards"/);
  const flashcard=html.slice(html.indexOf("function renderFlashcard()"));
  assert.ok(flashcard.indexOf("if(!card)")<flashcard.indexOf("articleMnemonicInfo(card.lawId"),"字卡完成後應先處理空牌組再讀取條文資料");
});

test("existing private study keys remain present",()=>{
  for(const key of [
    "police-promotion-warroom-v011",
    "lexcore-spaced-review-v20",
    "lexcore-daily-progress-v20",
    "lexcore-question-review-flags-v15",
    "lexcore-study-calendar-v28",
    "lexcore-focus-logs-v27"
  ])assert.match(html,new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
});
