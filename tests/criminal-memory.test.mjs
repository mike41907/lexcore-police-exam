import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import memory from "../data/memory/criminal-memory.json" with {type:"json"};
import manual from "../data/manual-article-mnemonics.json" with {type:"json"};
import {buildArticleMnemonic} from "../scripts/lib/mnemonics.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

test("DOCX criminal memory pack keeps the complete replacement dataset",()=>{
  assert.equal(memory.total,422);
  assert.equal(memory.active,402);
  assert.equal(memory.deleted,20);
  assert.equal(memory.priorityCounts.A,320);
  assert.equal(memory.priorityCounts.B,82);
  assert.equal(memory.priorityCounts.X,20);
  assert.equal(Object.keys(memory.articles).length,422);
  assert.equal(Object.keys(manual).some(key=>key.startsWith("criminal:")),false);
  assert.equal(memory.articles["23"].keyword,"正當防衛");
  assert.match(memory.articles["23"].memory10s,/現在、不法、侵害、防衛/);
  assert.equal(memory.articles["34"].status,"deleted");
  assert.equal(memory.articles["34"].priority,"X");
});

test("imported cards expose the DOCX fields and deleted status",()=>{
  const source=memory.articles["13"];
  const card=buildArticleMnemonic({
    key:"criminal:13",
    record:{lawId:"criminal",lawName:"中華民國刑法",article:"13",text:"故意或過失。"},
    manual:{...source,source:"LexCore-memory-pack"}
  });
  assert.equal(card.kind,"curated");
  assert.equal(card.source,"LexCore-memory-pack");
  assert.equal(card.chant,source.memory10s);
  assert.equal(card.explain30s,source.explain30s);
  assert.equal(card.trap,source.trap);
  assert.equal(card.recallQuestion,source.recallQuestion);

  const deleted=buildArticleMnemonic({
    key:"criminal:34",
    record:{lawId:"criminal",lawName:"中華民國刑法",article:"34",text:""},
    manual:{...memory.articles["34"],source:"LexCore-memory-pack"}
  });
  assert.equal(deleted.kind,"deleted");
  assert.equal(deleted.status,"現行已刪除／舊題版本風險");
  assert.match(deleted.note,/不生成現行法構成要件/);
});

test("generated runtime contains every replacement criminal card",()=>{
  const runtime=JSON.parse(fs.readFileSync(path.join(root,"data/runtime.json"),"utf8"));
  const cards=Object.entries(runtime.frontend.mnemonics||{}).filter(([key])=>key.startsWith("criminal:"));
  assert.equal(cards.length,422);
  assert.equal(runtime.frontend.mnemonics["criminal:1"].chant,memory.articles["1"].memory10s);
  assert.equal(runtime.frontend.mnemonics["criminal:34"].kind,"deleted");
});
