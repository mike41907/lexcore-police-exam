import test from "node:test";
import assert from "node:assert/strict";
import frequency from "../data/cpl-issue-frequency.json" with {type:"json"};

test("刑訴爭點頻率資料保留來源與三種考試視角",()=>{
  assert.equal(frequency.source.url,"https://lucplaw.com/116-issue-analyzer-9c4e7a1f2d");
  assert.equal(frequency.source.period,"民國110–115年");
  assert.deepEqual(Object.keys(frequency.views).sort(),["all","guard","police"]);
  assert.deepEqual(
    [frequency.views.police.questionCount,frequency.views.police.markerCount],
    [315,527]
  );
  assert.deepEqual(
    [frequency.views.guard.questionCount,frequency.views.guard.markerCount],
    [129,186]
  );
  assert.deepEqual(
    [frequency.views.all.questionCount,frequency.views.all.markerCount],
    [1136,1646]
  );
});

test("排行依來源次數遞減且保留明確條號引用",()=>{
  const topByView={police:"附帶搜索",guard:"訊問／詢問程序",all:"附帶搜索"};
  for(const [viewId,view] of Object.entries(frequency.views)){
    assert.ok(view.issues.length>0);
    assert.equal(view.issues[0].rank,1);
    assert.equal(view.issues[0].issue,topByView[viewId]);
    assert.ok(view.issues.every((row,i)=>row.rank===i+1));
    assert.ok(view.issues.every((row,i)=>!i||row.count<=view.issues[i-1].count));
  }
  assert.ok(frequency.views.police.issues.some(row=>row.articleRefs.includes("203-1")));
  assert.ok(frequency.views.guard.issues.some(row=>row.articleRefs.includes("203-1")));
  assert.ok(frequency.views.all.issues.some(row=>row.articleRefs.includes("203-1")));
});
