import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {parseSixLawsPage,__test} from "../scripts/lib/sixlaws.mjs";

test("6laws parser reads article titles and sibling judgment groups without a wrapper div",()=>{
  const html=`<h1>刑事訴訟法</h1>
    <h2><a name="a101b1"></a>第101條之1（羈押~要件2）</h2>
    <br/><h0>﹝1﹞有下列情形之一者，得羈押。</h0>
    <h8>【解釋/判例】</h8><a href="law1.htm#a1">釋字第1號</a>
    <h8>【具參考價值】</h8><a href="law2.htm#a2">最高法院109年度台抗字第1039號裁定</a>
    <h2>第102條（其他要件）</h2><div>下一條正文</div>`;
  const result=parseSixLawsPage(html,{lawId:"cpl",lawName:"刑事訴訟法",sourceUrl:"https://www.6laws.net/6law/law/刑事訴訟法.htm"});
  const article=result.articles["101-1"];
  assert.equal(article.title,"羈押~要件2");
  assert.equal(article.judgmentCount,2);
  assert.deepEqual(article.references.map(row=>row.label),["釋字第1號","最高法院109年度台抗字第1039號裁定"]);
  assert.ok(article.references.every(row=>row.type==="judgment"&&row.url.startsWith("https://www.6laws.net/")));
  assert.equal(result.articles["102"].references.length,0);
});

test("generated 6laws snapshot includes titles and indexes for matched laws",async()=>{
  const snapshot=JSON.parse(await readFile(new URL("../data/sixlaws-article-index.json",import.meta.url),"utf8"));
  assert.equal(snapshot.coverage.tracked,27);
  assert.equal(snapshot.coverage.matched,10);
  assert.ok(snapshot.laws.criminal.articles["1"].title);
  assert.ok(snapshot.laws.cpl.articles["101-1"].title);
  assert.ok(snapshot.laws.cpl.articles["101-1"].judgmentCount>=1);
  assert.ok(snapshot.laws.police_power.articles["8"].title);
  assert.equal(snapshot.laws.police_act_rules.matched,false);
});

test("6laws reference kind classification keeps law references separate",()=>{
  const helpers=__test();
  assert.equal(helpers.referenceType("相關判解"),"judgment");
  assert.equal(helpers.referenceType("具參考價值"),"judgment");
  assert.equal(helpers.referenceType("相關法規"),"law");
});
