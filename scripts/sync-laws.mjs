import * as cheerio from "cheerio";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fetchText, politeDelay} from "./lib/http.mjs";
import {readJson, writeJsonAtomic} from "./lib/fs.mjs";
import {htmlToText, normalizeSpace} from "./lib/text.mjs";
import {parseOfficialHistoryText} from "./lib/history.mjs";
import {cleanupArticleBody, parseLawAllStructure} from "./lib/law-all.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,"..");
const cfg=await readJson(path.join(ROOT,"config/laws.json"));

function parseHistory(html){
  const $=cheerio.load(html);
  return parseOfficialHistoryText(htmlToText($));
}
function escRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}
function parseArticle(html, article){
  const $=cheerio.load(html);
  const text=htmlToText($);
  const a=escRe(article).replace("\\-","[-－—–]?");
  const regs=[
    new RegExp(`第\\s*${a}\\s*條\\s*([\\s\\S]+?)(?=\\n\\s*第\\s*\\d+(?:\\s*[-－—–]\\s*\\d+)?\\s*條|\\n\\s*(?:相關法條|資料來源|歷史法規|沿革|附件|法規類別)|$)`),
    new RegExp(`第\\s*${a}\\s*條\\s*([\\s\\S]{10,6000})`)
  ];
  for(const r of regs){
    const m=text.match(r);
    if(m){
      const body=cleanupArticleBody(normalizeSpace(m[1]));
      if(body.length>=8) return body;
    }
  }
  return null;
}
for(const law of cfg.laws){
  console.log(`[law] ${law.name}`);
  const prev=await readJson(path.join(ROOT,`data/official/${law.id}.json`),{});
  let history=prev.history||[];
  try{
    const h=await fetchText(law.historyUrl,{timeoutMs:45000});
    const parsed=parseHistory(h);
    if(parsed.length) history=parsed;
    else throw new Error("history parser returned 0 events");
  }catch(e){
    console.warn(`  history fallback: ${e.message}`);
  }
  const windowEvents=history.filter(e=>e.rocYear>=cfg.window.rocStart && e.rocYear<=cfg.window.rocEnd);
  const fullTextUrl=`https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=${law.pcode}`;
  let articles={...(prev.articles||{})}, chapters=prev.chapters||[], fullTextOk=false, fullArticleCount=0, fullTextError=null;
  try{
    const raw=await fetchText(fullTextUrl,{timeoutMs:55000,retries:2});
    const parsed=parseLawAllStructure(htmlToText(cheerio.load(raw)));
    const entries=Object.entries(parsed.articles);
    if(!entries.length)throw new Error("full-text parser returned 0 articles");
    const fetchedAt=new Date().toISOString();
    const fresh={};
    for(const [article,body] of entries){
      fresh[article]={
        text:body,
        url:`https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=${encodeURIComponent(article)}&pcode=${law.pcode}`,
        fullTextUrl,fetchedAt,ok:true,source:"LawAll"
      };
    }
    articles=fresh;chapters=parsed.chapters;fullTextOk=true;fullArticleCount=entries.length;
    console.log(`  full text: ${entries.length} articles, ${chapters.length} outline entries`);
  }catch(e){
    fullTextError=e.message;
    console.warn(`  full-text fallback: ${e.message}`);
    // Compatibility fallback: at least keep key articles + recent amendments.
    const articleSet=new Set([...(law.keyArticles||[]), ...windowEvents.flatMap(e=>e.articles||[])]);
    for(const article of articleSet){
      const url=`https://law.moj.gov.tw/LawClass/LawSingle.aspx?flno=${encodeURIComponent(article)}&pcode=${law.pcode}`;
      try{
        const raw=await fetchText(url,{timeoutMs:35000,retries:2});
        const body=parseArticle(raw,article);
        if(body)articles[article]={text:body,url,fetchedAt:new Date().toISOString(),ok:true,source:"LawSingle"};
      }catch(e2){
        articles[article]={...(articles[article]||{}),url,ok:false,error:e2.message,checkedAt:new Date().toISOString()};
      }
      await politeDelay(70);
    }
    fullArticleCount=Object.values(articles).filter(x=>x?.ok&&x?.text).length;
  }
  const result={
    id:law.id,name:law.name,pcode:law.pcode,
    fetchedAt:new Date().toISOString(),
    latest:history[0]?.date||prev.latest||null,
    history, windowEvents, articles, chapters,
    fullTextUrl,fullTextOk,fullArticleCount,fullTextError,
    source:law.historyUrl
  };
  await writeJsonAtomic(path.join(ROOT,`data/official/${law.id}.json`),result);
}
