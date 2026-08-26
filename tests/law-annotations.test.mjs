import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

test("law reader exposes persistent highlight and annotation tools",()=>{
  assert.match(html,/const LAW_ANNOTATION_KEY="lexcore-law-annotations-v1"/);
  assert.match(html,/id="lawSelectionTools"/);
  assert.match(html,/data-law-highlight-color="yellow"/);
  assert.match(html,/data-law-highlight-color="green"/);
  assert.match(html,/data-law-highlight-color="pink"/);
  assert.match(html,/id="lawAnnotationInput"/);
  assert.match(html,/function setupLawAnnotations\(\)/);
  assert.match(html,/function lawAnnotationContextFromSelection\(\)/);
  assert.match(html,/function lawAnnotationCommit\(color="yellow",note=null,existingId=""\)/);
  assert.match(html,/function deleteLawAnnotation\(id\)/);
  assert.match(html,/data-law-paragraph=/);
  assert.match(html,/function applyLawAnnotationsToRoot\(root\)/);
  assert.match(html,/lawAnnotations:getLawAnnotations\(\)/);
});

test("highlight data stays on an independent local key and does not replace existing study keys",()=>{
  assert.match(html,/const LAW_READING_STATE_KEY="lexcore-law-reading-v1"/);
  assert.match(html,/const MNEMONIC_EDIT_KEY="lexcore-mnemonic-edits-v1"/);
  assert.match(html,/const FLASHCARD_STATE_KEY="lexcore-flashcard-state-v1"/);
  assert.match(html,/lexcore-spaced-review-v20/);
  assert.match(html,/lexcore-study-calendar-v28/);
  assert.match(html,/putLawAnnotations\(obj\.lawAnnotations\)/);
});
