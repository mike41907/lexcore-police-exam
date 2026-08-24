import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {readJson, writeJsonAtomic} from "./lib/fs.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,"..");
const DEFAULT_OUTPUT=path.join(ROOT,"data/memory/criminal-memory.json");
const SOURCE_LABEL="LexCore-memory-pack";
const SOURCE_DOCUMENT="LexCore_中華民國刑法全條文記憶包_Codex匯入版.docx";

function argument(name, fallback=""){
  const index=process.argv.indexOf(name);
  return index>=0?process.argv[index+1]||fallback:fallback;
}

function decodeXmlText(value=""){
  return String(value)
    .replace(/<w:tab[^>]*\/>/g,"\t")
    .replace(/<w:br[^>]*\/>/g,"\n")
    .replace(/<w:cr[^>]*\/>/g,"\n")
    .replace(/<w:t[^>]*>/g,"")
    .replace(/<\/w:t>/g,"")
    .replace(/<[^>]+>/g,"")
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/&quot;/g,'"')
    .replace(/&apos;/g,"'")
    .replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,number)=>String.fromCodePoint(Number(number)))
    .replace(/\r/g,"")
    .trim();
}

function readParagraphs(xml=""){
  return [...xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)]
    .map(match=>decodeXmlText(match[1]))
    .filter(Boolean);
}

function normalizeArticle(raw=""){
  return String(raw).replace(/\s+/g,"").replace(/之/g,"-");
}

function isChapterHeading(text=""){
  return /^(?:第[一二三四五六七八九十百千]+編|[一二三四五六七八九十百千]+編)/.test(text);
}

function splitExplanation(value=""){
  const match=String(value).match(/^(?<explain>[\s\S]*?)(?:\n\s*⚠\s*|\s*⚠\s*)(?<trap>[\s\S]+)$/);
  if(!match)return {explain30s:String(value).trim(),trap:""};
  return {explain30s:match.groups.explain.trim(),trap:match.groups.trap.trim()};
}

const xmlPath=argument("--xml",process.argv[2]);
if(!xmlPath){
  throw new Error("用法：node scripts/import-criminal-memory.mjs --xml <解壓後的 word/document.xml> [--output <JSON路徑>]");
}

const xml=await fs.readFile(path.resolve(xmlPath),"utf8");
const paragraphs=readParagraphs(xml);
const headingPattern=/^第(.+?)條\n([ABX])｜(現行|刪除)$/;
const articles={};
let chapter="";

for(let index=0;index<paragraphs.length;index+=1){
  const paragraph=paragraphs[index];
  if(!headingPattern.test(paragraph)){
    if(isChapterHeading(paragraph))chapter=paragraph;
    continue;
  }

  const [,rawArticle,priority,statusLabel]=paragraph.match(headingPattern);
  const article=normalizeArticle(rawArticle);
  const fields=paragraphs.slice(index+1,index+5);
  if(fields.length!==4){
    throw new Error(`第${article}條後方不是固定四欄，位置 ${index}`);
  }
  if(articles[article])throw new Error(`發現重複條號：${article}`);
  const {explain30s,trap}=splitExplanation(fields[2]);
  articles[article]={
    lawId:"criminal",
    article,
    status:statusLabel==="刪除"?"deleted":"active",
    priority,
    chapter,
    keyword:fields[0],
    memory10s:fields[1],
    explain30s,
    trap,
    recallQuestion:fields[3],
    sourcePriority:"official-law-first",
    source:SOURCE_LABEL,
    needs_review:false
  };
  index+=4;
}

const values=Object.values(articles);
const deleted=values.filter(item=>item.status==="deleted").length;
const active=values.length-deleted;
const output={
  formatVersion:"1.0",
  source:SOURCE_LABEL,
  sourceDocument:SOURCE_DOCUMENT,
  lawId:"criminal",
  officialBasis:"民國115年7月22日；官方現行全文仍以全國法規資料庫 LawAll 為唯一法律文字來源。",
  importedAt:new Date().toISOString(),
  total:values.length,
  active,
  deleted,
  priorityCounts:Object.fromEntries(["A","B","C","X"].map(level=>[level,values.filter(item=>item.priority===level).length])),
  articles
};

const outputPath=path.resolve(argument("--output",DEFAULT_OUTPUT));
await writeJsonAtomic(outputPath,output);

// The DOCX is now the sole criminal-law mnemonic source. Keep unrelated law cards.
const manualPath=path.join(ROOT,"data/manual-article-mnemonics.json");
const manual=await readJson(manualPath,{});
const retained=Object.fromEntries(Object.entries(manual).filter(([key])=>!key.startsWith("criminal:")));
await writeJsonAtomic(manualPath,retained);

console.log(`[criminal-memory] imported=${values.length}, active=${active}, deleted=${deleted}, output=${outputPath}`);
