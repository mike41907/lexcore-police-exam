import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import * as cheerio from "cheerio";

const SOURCE_URL="https://lu-criminal-procedure-law.netlify.app/116ccp-6da70c98.html";
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const OUTPUT=path.join(ROOT,"data/lawmap/lu-criminal-procedure-116.json");

function normalize(value=""){
  return String(value||"")
    .replace(/\u00a0/g," ")
    .replace(/\r/g,"")
    .replace(/[ \t]+\n/g,"\n")
    .replace(/\n[ \t]+/g,"\n")
    .replace(/[ \t]{2,}/g," ")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function textWithBreaks($,node){
  const clone=$(node).clone();
  clone.find("br").replaceWith("\n");
  clone.find("strong.proj").each((_,el)=>$(el).before("\n"));
  return normalize(clone.text());
}

function sectionCount(title=""){
  const match=String(title).match(/(?:\s|（|\()([0-9]+)\s*項\s*）?$/);
  return match?Number(match[1]):null;
}

function sectionLabel(title=""){
  return normalize(String(title).replace(/\s+[0-9]+\s*項\s*$/, ""));
}

function articleNo(reference=""){
  const raw=normalize(reference).replace(/\s+/g," ");
  let match=raw.match(/§\s*([0-9]+(?:\s*[-之]\s*[0-9]+)?)/);
  if(match)return match[1].replace(/\s+/g,"").replace(/之/g,"-");
  match=raw.match(/釋字第\s*([0-9]+)\s*號/);
  if(match)return `釋字${match[1]}`;
  match=raw.match(/([0-9]{2,3})年憲判字第\s*([0-9]+)\s*號/);
  if(match)return `${match[1]}憲判${match[2]}`;
  return "";
}

function itemKind(category=""){
  if(category==="刑訴")return "article";
  if(category==="釋字")return "interpretation";
  if(category==="憲判")return "constitutional-judgment";
  if(category==="決議／院解")return "resolution";
  if(["最高法院","判決"].includes(category))return "judgment";
  return "related";
}

function recallPrompt(kind,reference,title){
  if(kind==="article")return `請先回想${reference}「${title}」：主題、要件／程序順序、期限與例外。`;
  if(kind==="interpretation"||kind==="constitutional-judgment")return `請先回想${reference}「${title}」：爭點、結論、理由與對考題的影響。`;
  return `請先回想${reference}「${title}」：它處理的問題、規則與最容易混淆的例外。`;
}

const response=await fetch(SOURCE_URL,{headers:{"user-agent":"LexCore data importer"}});
if(!response.ok)throw new Error(`法條地圖來源讀取失敗：HTTP ${response.status}`);
const html=await response.text();
const $=cheerio.load(html,{decodeEntities:true});
const chapters=[];
const items=[];

$("section.chapter").each((chapterIndex,chapter)=>{
  const chapterId=normalize($(chapter).attr("id")||`chapter-${chapterIndex+1}`);
  const chapterTitle=normalize($(chapter).find(".chap-title").first().text());
  const sectionRows=[];
  $(chapter).find("div.section").each((sectionIndex,section)=>{
    const rawSectionTitle=normalize($(section).find("h3.sec-title").first().text());
    if(!rawSectionTitle)return;
    const sectionId=`${chapterId}-section-${sectionIndex+1}`;
    const sectionTitle=sectionLabel(rawSectionTitle);
    const row={id:sectionId,title:sectionTitle,count:sectionCount(rawSectionTitle),itemIds:[]};
    $(section).find("details.item").each((_,detail)=>{
      const summary=$(detail).find("summary").first();
      const category=normalize(summary.find(".cat-tag").first().text());
      const reference=normalize(summary.find(".art-num").first().text());
      const title=normalize(summary.find(".art-title").first().text());
      const bodyNode=$(detail).find(".item-body").first();
      const bodyText=textWithBreaks($,bodyNode);
      const paragraphs=bodyText.split(/\n+/).map(normalize).filter(Boolean);
      const kind=itemKind(category);
      const id=normalize($(detail).attr("id")||`i${items.length+1}`);
      const record={
        id:`lu-${id}`,
        kind,
        category,
        reference,
        articleNo:articleNo(reference),
        title,
        chapterId,
        chapterTitle,
        sectionId,
        sectionTitle,
        content:bodyText,
        paragraphs,
        recallPrompt:recallPrompt(kind,reference,title),
        sourceUrl:SOURCE_URL
      };
      items.push(record);
      row.itemIds.push(record.id);
    });
    sectionRows.push(row);
  });
  chapters.push({id:chapterId,title:chapterTitle,sections:sectionRows});
});

const categoryCounts=Object.fromEntries([...new Set(items.map(x=>x.category))].sort().map(category=>[category,items.filter(x=>x.category===category).length]));
const kindCounts=Object.fromEntries([...new Set(items.map(x=>x.kind))].sort().map(kind=>[kind,items.filter(x=>x.kind===kind).length]));
const articleIndex={};
for(const item of items){
  if(item.kind!=="article"||!item.articleNo)continue;
  (articleIndex[item.articleNo]??=[]).push(item.id);
}
const metaDescription=normalize($("meta[name=description]").attr("content")||"");
const payload={
  schemaVersion:"1.0",
  source:{
    url:SOURCE_URL,
    title:normalize($("title").first().text()),
    publisher:"呂律師刑事訴訟法法條地圖",
    retrievedAt:new Date().toISOString(),
    description:metaDescription,
    classification:"第三方教學整理；現行法條文字仍以系統內嵌的官方法規資料為準。"
  },
  law:{id:"cpl",name:"刑事訴訟法",pcode:"C0010001"},
  stats:{itemCount:items.length,chapterCount:chapters.length,sectionCount:chapters.reduce((sum,x)=>sum+x.sections.length,0),categoryCounts,kindCounts},
  chapters,
  articleIndex,
  items
};
await fs.mkdir(path.dirname(OUTPUT),{recursive:true});
await fs.writeFile(OUTPUT,`${JSON.stringify(payload,null,2)}\n`,`utf8`);
console.log(`[lawmap] items=${items.length}, chapters=${chapters.length}, sections=${payload.stats.sectionCount}, output=${path.relative(ROOT,OUTPUT)}`);
