import * as cheerio from "cheerio";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fetchText, politeDelay} from "./lib/http.mjs";
import {readJson, writeJsonAtomic} from "./lib/fs.mjs";
import {htmlToText, normalizeSpace} from "./lib/text.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,"..");
const OUT=path.join(ROOT,"data/official/court.json");
const old=await readJson(OUT,{cases:[]});
const oldMap=new Map((old.cases||[]).map(x=>[x.no,x]));

function abs(href){try{return new URL(href,"https://cons.judicial.gov.tw/").toString()}catch{return href}}
function parseCourtDate(text=""){
  const value=normalizeSpace(text);
  const iso=value.match(/(?:判決日期|裁判日期)\s*(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if(iso)return iso[1]+"-"+iso[2].padStart(2,"0")+"-"+iso[3].padStart(2,"0");
  const roc=value.match(/(?:判決日期|裁判日期)\s*(?:民國\s*)?(\d{2,3})年(\d{1,2})月(\d{1,2})日/);
  if(roc)return String(Number(roc[1])+1911)+"-"+roc[2].padStart(2,"0")+"-"+roc[3].padStart(2,"0");
  return null;
}
async function listCases(){
  const map=new Map();
  for(let page=1;page<=10;page++){
    const url=`https://cons.judicial.gov.tw/judcurrentNew1.aspx?fid=38&page=${page}&tab=1`;
    const html=await fetchText(url,{timeoutMs:45000});
    const $=cheerio.load(html);
    let added=0;
    $("a").each((_,a)=>{
      const tx=normalizeSpace($(a).text());
      const m=tx.match(/((11[1-5])年憲判字第(\d+)號)(?:[〖【](.*?)[〗】])?/);
      if(!m || !m[4]) return; // result-list link with case title
      const no=m[1], year=Number(m[2]), title=m[4];
      const href=abs($(a).attr("href")||"");
      const context=normalizeSpace($(a).closest("tr,li,div").text());
      const parsedDate=parseCourtDate(context);
      const dm=context.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/);
      const date=dm?`${dm[1]}-${dm[2].padStart(2,"0")}-${dm[3].padStart(2,"0")}`:null;
      if(!map.has(no)){map.set(no,{no,year,title,url:href,date:parsedDate||date});added++;}
    });
    if(page>1 && added===0) break;
    await politeDelay(120);
  }
  return [...map.values()].sort((a,b)=>(b.date||b.no).localeCompare(a.date||a.no,"zh-Hant"));
}
function section(text, starts, ends){
  let pos=-1, startLabel="";
  for(const s of starts){const i=text.indexOf(s);if(i>=0&&(pos<0||i<pos)){pos=i;startLabel=s;}}
  if(pos<0) return "";
  const begin=pos+startLabel.length;
  let end=text.length;
  for(const e of ends){const i=text.indexOf(e,begin);if(i>=0&&i<end)end=i;}
  return normalizeSpace(text.slice(begin,end)).slice(0,16000);
}
function relatedLaws(text){
  const names=["刑事訴訟法","中華民國刑法","刑法","憲法訴訟法","社會秩序維護法","警察職權行使法","警械使用條例","警察法","警察勤務條例","少年事件處理法","刑法施行法","憲法"];
  const out=new Set();
  for(const name of names){
    const rx=new RegExp(`${name}[^。；\\n]{0,45}?第\\s*[0-9一二三四五六七八九十百千零〇]+(?:\\s*條\\s*之\\s*[0-9一二三四五六七八九十百千零〇]+|\\s*條)`, "g");
    for(const m of text.matchAll(rx)) out.add(normalizeSpace(m[0]));
  }
  return [...out].slice(0,30);
}
function sentences(s,max=5){
  return normalizeSpace(s).split(/(?<=[。！？；])\s*/).filter(x=>x.length>8).slice(0,max);
}
function autoVerdict(main,full){
  const s=main||full;
  if(/違憲.*失效|宣告.*違憲|牴觸憲法/.test(s)) return "違憲／部分違憲";
  if(/尚無違背|不違反|合憲/.test(s)) return "合憲";
  if(/駁回/.test(s)) return "駁回／其他";
  return "判決";
}
const cases=await listCases();
for(const c of cases){
  const cached=oldMap.get(c.no);
  if(cached?.detailFetched && cached?.url===c.url){
    Object.assign(c,cached);
    if(!c.date)c.date=parseCourtDate([c.officialSummary,c.reasonExcerpt,c.main].filter(Boolean).join(" "));
    continue;
  }
  try{
    const html=await fetchText(c.url,{timeoutMs:45000,retries:3});
    const $=cheerio.load(html), text=htmlToText($);
    const main=section(text,["主文","主 文"],["理由","理 由","判決理由","摘要"]);
    const summary=section(text,["判決摘要","摘要"],["主文","理由","全文","相關檔案"]);
    const reason=section(text,["理由","理 由","判決理由"],["協同意見","不同意見","部分不同意見","相關檔案"]);
    c.main=main;
    c.officialSummary=summary;
    c.reasonExcerpt=reason.slice(0,12000);
    c.date=parseCourtDate(text)||c.date;
    c.related=relatedLaws(`${main}\n${summary}\n${reason}`);
    c.auto={
      verdict:autoVerdict(main,`${summary}\n${reason}`),
      holding:sentences(main||summary,5),
      reasons:sentences(summary||reason,6),
      memory:sentences(summary||main||reason,1)[0]||c.title
    };
    c.detailFetched=true;
    c.fetchedAt=new Date().toISOString();
  }catch(e){
    c.detailFetched=false;c.error=e.message;
    if(cached) Object.assign(cached,{date:c.date||cached.date,title:c.title||cached.title,url:c.url||cached.url}), Object.assign(c,cached);
  }
  await politeDelay(130);
}
await writeJsonAtomic(OUT,{
  fetchedAt:new Date().toISOString(),
  source:"https://cons.judicial.gov.tw/judcurrentNew1.aspx?fid=38",
  total:cases.length,
  cases
});
console.log(`[court] ${cases.length} cases`);
