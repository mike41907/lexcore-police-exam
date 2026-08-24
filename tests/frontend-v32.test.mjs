import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const sw=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");

test("v3.3 release markers and cache version stay synchronized",()=>{
  assert.equal(pkg.version,"3.3.0");
  assert.match(html,/目前 v3\.3\.0/);
  assert.match(html,/release-version">v3\.3\.0/);
  assert.match(sw,/lexcore-v3\.3\.0/);
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
