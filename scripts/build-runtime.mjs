import path from "node:path";
import {fileURLToPath} from "node:url";
import {readJson, writeJsonAtomic} from "./lib/fs.mjs";
import {diffWords} from "diff";
import {cleanupArticleBody} from "./lib/law-all.mjs";
import {buildMnemonicCatalog} from "./lib/mnemonics.mjs";
import {splitReasonPoints} from "./lib/reasons.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,"..");
const cfg=await readJson(path.join(ROOT,"config/laws.json"));
const base=await readJson(path.join(ROOT,"data/base.json"));
const manualDetails=await readJson(path.join(ROOT,"data/manual-article-details.json"),{});
const manualMnemonicBase=await readJson(path.join(ROOT,"data/manual-article-mnemonics.json"),{});
const criminalMemory=await readJson(path.join(ROOT,"data/memory/criminal-memory.json"),{articles:{}});
const retainedManualMnemonics=Object.fromEntries(
  Object.entries(manualMnemonicBase).filter(([key])=>!key.startsWith("criminal:"))
);
const importedCriminalMnemonics=Object.fromEntries(
  Object.entries(criminalMemory.articles||{}).map(([article,item])=>[
    `criminal:${article}`,
    {
      title:item.keyword,
      keyword:item.keyword,
      chapter:item.chapter,
      chant:item.memory10s,
      memory10s:item.memory10s,
      explain30s:item.explain30s,
      trap:item.trap,
      recall:item.recallQuestion,
      recallQuestion:item.recallQuestion,
      priority:item.priority,
      status:item.status,
      source:item.source||criminalMemory.source||"LexCore-memory-pack",
      needs_review:item.needs_review
    }
  ])
);
const manualMnemonics={...retainedManualMnemonics,...importedCriminalMnemonics};
const manualCourt=await readJson(path.join(ROOT,"data/manual-court-study.json"),{});
const ly=await readJson(path.join(ROOT,"data/legislative/matches.json"),{matches:{}});
const courtRaw=await readJson(path.join(ROOT,"data/official/court.json"),{cases:[]});
const issueFrequency=await readJson(path.join(ROOT,"data/cpl-issue-frequency.json"),null);
const sixLaws=await readJson(path.join(ROOT,"data/sixlaws-article-index.json"),null);
const lawMap=await readJson(path.join(ROOT,"data/lawmap/lu-criminal-procedure-116.json"),null);

const lawRaw={};
for(const l of cfg.laws) lawRaw[l.id]=await readJson(path.join(ROOT,`data/official/${l.id}.json`),null);

const data=structuredClone(base);
for(const law of data.laws){
  const raw=lawRaw[law.id];
  if(!raw) continue;
  const events=(raw.windowEvents||[]).map(e=>({
    date:e.rocDate,
    isoDate:e.date,
    articles:(e.articles||[]).length?`第 ${(e.articles||[]).join("、")} 條`:e.raw.slice(0,120),
    note:e.raw,
    article_ids:e.articles||[]
  }));
  if(events.length) law.events=events;
  law.latest=raw.latest ? `${Number(raw.latest.slice(0,4))-1911}/${raw.latest.slice(5,7)}/${raw.latest.slice(8,10)}` : law.latest;
  law.distinct_articles=new Set(events.flatMap(e=>e.article_ids)).size;
  if(!events.length) law.no_recent=`民國${cfg.window.rocStart}～${cfg.window.rocEnd}年無修法；系統持續監測官方沿革。`;
}
// Update court index from official crawler.
if(courtRaw.cases?.length){
  data.court=courtRaw.cases.map(c=>({
    no:c.no,date:c.date?`${Number(c.date.slice(0,4))-1911}/${c.date.slice(5,7)}/${c.date.slice(8,10)}`:"",
    title:c.title,links:c.related||[],summary:c.officialSummary||c.auto?.memory||c.title,
    url:c.url,importance:manualCourt[c.no]?.exam||3
  }));
}

// Create auto article details only when LY match is auto-verified; manual details always win.
const details={};
for(const [key,item] of Object.entries(ly.matches||{})){
  if(item.status!=="auto-verified" || !item.previous || !item.current) continue;
  const baseKey=`${item.lawId}:${item.article}`;
  const parts=diffWords(item.previous,item.current);
  const changes=[];
  const added=parts.filter(x=>x.added).map(x=>x.value.trim()).filter(Boolean).join(" ").slice(0,260);
  const removed=parts.filter(x=>x.removed).map(x=>x.value.trim()).filter(Boolean).join(" ").slice(0,260);
  if(added) changes.push(`新增／改寫：${added}`);
  if(removed) changes.push(`刪除／舊文：${removed}`);
  details[baseKey]={
    law_id:item.lawId,law_name:item.lawName,article:item.article,amend_date:item.rocDate,
    status:`自動配對 ${(item.confidence*100).toFixed(0)}%`,status_type:"good",
    current:item.current,previous:item.previous,changes,
    memory:"尚未人工編寫記憶句；以下條文與理由由官方資料自動同步。",
    reason:item.reason||"立法院資料未提供說明。",
    reason_label:"立法院條文對照表說明（自動高信心配對）",
    exam:["此筆為自動同步資料；考試記憶點尚待人工整理。"],
    official:`https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=${encodeURIComponent(item.article)}&pcode=${cfg.laws.find(x=>x.id===item.lawId)?.pcode||""}`,
    reason_url:item.docUrl||"https://data.ly.gov.tw/getds.action?id=19",
    sync_meta:{confidence:item.confidence,evidence:item.evidence,billNo:item.billNo,docNo:item.docNo}
  };
}
Object.assign(details,manualDetails);
for(const detail of Object.values(details)){
  if(detail?.reason)detail.reason_points=splitReasonPoints(detail.reason);
}

// Merge deterministic court extraction with manual study cards.
const courtStudy={};
for(const c of courtRaw.cases||[]){
  courtStudy[c.no]={
    verdict:c.auto?.verdict||"判決",
    verdict_type:/違憲/.test(c.auto?.verdict||"")?"red":"green",
    exam:3,practice:3,category:"憲法法庭",
    memory:c.auto?.memory||c.title,
    issue:c.title,
    holding:c.auto?.holding?.length?c.auto.holding:[c.main||c.officialSummary||c.title],
    reasons:c.auto?.reasons?.length?c.auto.reasons:[c.officialSummary||"請開啟官方判決查看理由。"],
    impact:"系統已自動抓取官方判決；人工考點整理尚待補充。",
    exam_tips:["此案為自動同步判決卡片，考試重要度尚未人工校準。"],
    related:c.related||[],source:c.url,
    sync_meta:{fetchedAt:c.fetchedAt,auto:true}
  };
}
Object.assign(courtStudy,manualCourt);

const lawStats=cfg.laws.map(l=>({
  id:l.id,name:l.name,ok:!!lawRaw[l.id],latest:lawRaw[l.id]?.latest||null,
  articleCount:Object.values(lawRaw[l.id]?.articles||{}).filter(x=>x.ok&&x.text).length,
  fullTextOk:!!lawRaw[l.id]?.fullTextOk,
  fullTextUrl:lawRaw[l.id]?.fullTextUrl||`https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${l.pcode}`
}));
const lawCatalog=cfg.laws.map(l=>({
  id:l.id,name:l.name,aliases:l.aliases||[],pcode:l.pcode,category:l.category,
  parentLaw:l.parentLaw||null,relationType:l.relationType||null,
  articleIds:Object.keys(lawRaw[l.id]?.articles||{}).filter(a=>lawRaw[l.id]?.articles?.[a]?.ok&&lawRaw[l.id]?.articles?.[a]?.text)
    .sort((a,b)=>{const ap=a.split("-").map(Number),bp=b.split("-").map(Number);return (ap[0]-bp[0])||((ap[1]||0)-(bp[1]||0));}),
  chapters:(lawRaw[l.id]?.chapters||[]).filter(c=>c?.label&&c?.article&&lawRaw[l.id]?.articles?.[c.article]?.ok&&lawRaw[l.id]?.articles?.[c.article]?.text),
  fullTextOk:!!lawRaw[l.id]?.fullTextOk,
  fullTextUrl:lawRaw[l.id]?.fullTextUrl||`https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${l.pcode}`
}));

const articleTexts={};
for(const law of cfg.laws){
  const raw=lawRaw[law.id];
  for(const [article,rec] of Object.entries(raw?.articles||{})){
    if(rec?.ok && rec?.text){
      articleTexts[`${law.id}:${article}`]={
        lawId:law.id, lawName:law.name, article,
        text:cleanupArticleBody(rec.text), url:rec.url, fetchedAt:rec.fetchedAt||raw.fetchedAt||null
      };
    }
  }
}

const runtime={
  generatedAt:new Date().toISOString(),
  sync:{
    status:"ok",
    laws:lawStats,
    court:{count:courtRaw.cases?.length||0,fetchedAt:courtRaw.fetchedAt||null},
    legislative:{
      matched:Object.keys(ly.matches||{}).length,
      autoVerified:Object.values(ly.matches||{}).filter(x=>x.status==="auto-verified").length,
      needsReview:Object.values(ly.matches||{}).filter(x=>x.status==="needs-review").length,
      fetchedAt:ly.fetchedAt||null
    }
  },
  frontend:{data,details,courtStudy,articleTexts,lawCatalog,issueFrequency,mnemonics:buildMnemonicCatalog(articleTexts,details,manualMnemonics,issueFrequency),sixLaws,lawMap}
};
await writeJsonAtomic(path.join(ROOT,"data/runtime.json"),runtime);
console.log(`[runtime] laws=${lawStats.length}, court=${runtime.sync.court.count}, LY-auto=${runtime.sync.legislative.autoVerified}, review=${runtime.sync.legislative.needsReview}`);
