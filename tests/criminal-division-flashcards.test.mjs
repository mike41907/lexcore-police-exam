import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"data","flashcards","criminal-division","manifest.json"),"utf8"));

test("criminal division PDF flashcard deck preserves source and nonblank page count",()=>{
  assert.equal(manifest.sourcePageCount,112);
  assert.equal(manifest.cardCount,104);
  assert.deepEqual(manifest.skippedBlankPages,[30,45,50,55,60,79,90,94]);
  assert.equal(manifest.cards.length,104);
  assert.ok(manifest.cards.every(card=>card.image.startsWith("pages/")&&card.sourcePage>0&&fs.existsSync(path.join(root,"data","flashcards","criminal-division",card.image))));
  assert.ok(fs.existsSync(path.join(root,"data","flashcards","criminal-division",manifest.sourceFile)));
});

test("flashcards provide a fullscreen fallback without changing existing study state",()=>{
  assert.match(html,/option value="criminal-pdf"/);
  assert.match(html,/const FLASHCARD_STATE_KEY="lexcore-flashcard-state-v1"/);
  assert.match(html,/const FLASHCARD_PDF_STATE_KEY="lexcore-pdf-flashcard-state-v1"/);
  assert.match(html,/function openFlashcardFullscreen\(\)/);
  assert.match(html,/function requestFlashcardNativeFullscreen\(\)/);
  assert.match(html,/id="flashcardFullscreen"/);
  assert.match(html,/function renderPdfFlashcard\(\)/);
  assert.match(html,/function startCriminalPdfFlashcards\(\)/);
  assert.match(html,/new URL\(card\.image,base\)\.href/);
});
