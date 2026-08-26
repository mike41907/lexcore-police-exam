import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

test("6laws source panel stays hidden while article titles remain visible",()=>{
  assert.match(html,/const SHOW_SIXLAWS_UI=false/);
  assert.match(html,/if\(!SHOW_SIXLAWS_UI\)return ""/);
  const start=html.indexOf("function renderFullStudy()");
  const end=html.indexOf("\/\* ---------- Quick law lookup",start);
  assert.ok(start>=0&&end>start,"renderFullStudy block should exist");
  const render=html.slice(start,end);
  assert.doesNotMatch(render,/6laws 名稱／判解索引/);
  assert.doesNotMatch(render,/6laws 尚未配對本法公開逐條頁/);
  assert.doesNotMatch(render,/sixInfo\?\.title|sixInfo\?\.judgmentCount/);
  const modalStart=html.indexOf("function openArticle(lid,a)");
  const lookupStart=html.indexOf("function homeQuickLookup()",modalStart);
  assert.ok(modalStart>=0&&lookupStart>modalStart,"article modal block should exist");
  assert.doesNotMatch(html.slice(modalStart,lookupStart),/sixInfo\?\.title|判解 \$\{/);
  assert.doesNotMatch(html.slice(lookupStart,end),/sixInfo\?\.title|sixInfo\?\.judgmentCount|sixInfo\?\.lawCount/);
  assert.match(html,/滑到這裡載入記憶卡/);
  assert.match(html,/function sixLawsArticleInfo\(lid,article\)/);
  assert.match(html,/function lawArticleTitleMarkup\(lid,article\)/);
  assert.match(render,/lawArticleTitleMarkup\(/);
  assert.match(html.slice(modalStart,lookupStart),/articleTitle=cleanText\(sixLawsArticleInfo\(lid,a\)/);
});
