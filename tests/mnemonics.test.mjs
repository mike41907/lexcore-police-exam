import test from "node:test";
import assert from "node:assert/strict";
import {buildArticleMnemonic,buildMnemonicCatalog,__test} from "../scripts/lib/mnemonics.mjs";
import manual from "../data/manual-article-mnemonics.json" with {type:"json"};

test("manual mnemonic cards preserve a usable rule order and recall prompt",()=>{
  const card=buildArticleMnemonic({
    key:"police_duty:11",
    record:{lawId:"police_duty",lawName:"警察勤務條例",article:"11",text:"警察勤務方式如下：\n一、勤區查察。\n二、巡邏。\n三、臨檢。\n四、守望。\n五、值班。\n六、備勤。"},
    manual:manual["police_duty:11"]
  });
  assert.equal(card.kind,"curated");
  assert.match(card.chant,/勤巡臨守值備/);
  assert.match(card.order,/勤區查察.*巡邏.*臨檢/);
  assert.match(card.recall,/遮住條文/);
  assert.equal(card.numbers.length,0);
});

test("automatic mnemonic generation exposes structure, numbers, exceptions and signals",()=>{
  const card=buildArticleMnemonic({
    key:"demo:7",
    record:{lawId:"demo",lawName:"測試法",article:"7",text:"有下列各款行為者，處三萬元以下罰鍰：\n一、無正當理由跟追。\n二、經勸阻不聽。但情形急迫者，不在此限。"}
  });
  assert.equal(card.kind,"auto");
  assert.match(card.chant,/2款順序/);
  assert.ok(card.order.includes("一、"));
  assert.ok(card.numbers.includes("三萬元以下"));
  assert.ok(card.exception.includes("不在此限"));
  assert.match(card.note,/結構化草稿/);
});

test("numbered legal items become readable mnemonic labels instead of object strings",()=>{
  const card=buildArticleMnemonic({
    key:"cpl:71",
    record:{lawId:"cpl",lawName:"刑事訴訟法",article:"71",text:"傳喚被告，應用傳票：\n一、被告之姓名、性別、出生年月日、身分證明文件編號及住、居所。\n二、案由。\n三、應到之日、時、處所。\n四、無正當理由不到場者，得命拘提。\n被告之姓名不明時，得記載辨別特徵。"}
  });
  assert.doesNotMatch(card.chant,/\[object Object\]/);
  assert.match(card.chant,/4款順序：一身分資料→二案由→三到場時間地點→四不到場→拘提/);
  assert.match(card.order,/一、.*身分資料/);
  assert.match(card.order,/四、不到場→拘提/);
});

test("catalog covers official records and does not label generated placeholder memory as curated",()=>{
  const catalog=buildMnemonicCatalog({
    "demo:1":{lawId:"demo",lawName:"測試法",article:"1",text:"本法為規範警察勤務。"},
    "demo:2":{lawId:"demo",lawName:"測試法",article:"2",text:""}
  },{
    "demo:2":{law_id:"demo",law_name:"測試法",article:"2",memory:"尚未人工編寫記憶句；以下條文與理由由官方資料自動同步。"}
  });
  assert.equal(catalog["demo:1"].kind,"auto");
  assert.equal(catalog["demo:2"].kind,"pending");
  assert.equal(Object.keys(catalog).length,2);
});

test("numbered item parser keeps the legal order",()=>{
  const rows=__test.extractNumberedItems("一、勤區查察。\n二、巡邏。\n三、臨檢。");
  assert.deepEqual(rows.map(row=>row.number),["一","二","三"]);
  assert.deepEqual(rows.map(row=>row.text),["勤區查察","巡邏","臨檢"]);
});
