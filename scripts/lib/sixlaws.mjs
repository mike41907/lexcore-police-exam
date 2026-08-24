import * as cheerio from "cheerio";
import {parseArticleNo} from "./text.mjs";

const JUDGMENT_KIND_RE=/判解|判例|決議|裁判|判決|裁定|解釋|憲法判決|大法庭見解|參考價值/i;
const LAW_KIND_RE=/相關法規|相關規定|法規命令/i;

function cleanText(value=""){
  return String(value).replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
}

function normalizeKind(value=""){
  return cleanText(value).replace(/[【】\[\]]/g,"")||"其他參照";
}

function referenceType(kind=""){
  if(JUDGMENT_KIND_RE.test(kind))return "judgment";
  if(LAW_KIND_RE.test(kind))return "law";
  if(/修正理由|立法理由/.test(kind))return "reason";
  return "other";
}

function absoluteUrl(href,sourceUrl){
  try{return new URL(href,sourceUrl).href}
  catch{return String(href||"")}
}

function articleTitle(heading=""){
  const rest=String(heading).replace(/^第\s*[0-9零〇一二兩三四五六七八九十百千]+\s*條(?:\s*之\s*[0-9零〇一二兩三四五六七八九十百千]+)?/u,"").trim();
  const m=rest.match(/^[（(]\s*(.*?)\s*[）)]$/u);
  return cleanText(m?m[1]:rest)||null;
}

function parseReferences($,body,sourceUrl){
  const references=[];
  body.find("h8").each((_,heading)=>{
    const kind=normalizeKind($(heading).text());
    const links=[];
    let sibling=$(heading).next();
    while(sibling.length&&!sibling.is("h1,h2,h3,h4,h5,h6,h8")){
      if(sibling.is("a")){
        const label=cleanText(sibling.text());
        if(label)links.push({label,url:absoluteUrl(sibling.attr("href"),sourceUrl)});
      }
      sibling.find("a").each((__,a)=>{
        const label=cleanText($(a).text());
        if(label)links.push({label,url:absoluteUrl($(a).attr("href"),sourceUrl)});
      });
      sibling=sibling.next();
    }
    for(const link of links){
      if(!references.some(x=>x.kind===kind&&x.label===link.label&&x.url===link.url)){
        references.push({kind,type:referenceType(kind),label:link.label,url:link.url});
      }
    }
  });
  return references;
}

function articleBody($,heading){
  const wrapper=$("<div></div>");
  let sibling=$(heading).next();
  while(sibling.length&&!sibling.is("h1,h2,h3,h4,h5,h6")){
    wrapper.append(sibling.clone());
    sibling=sibling.next();
  }
  return wrapper;
}

export function parseSixLawsPage(html,{lawId="",lawName="",sourceUrl=""}={}){
  const $=cheerio.load(String(html||""),{decodeEntities:true});
  const articles={};
  $("h2").each((_,heading)=>{
    const headingText=cleanText($(heading).text());
    const article=parseArticleNo(headingText);
    if(!article||articles[article])return;
    const body=articleBody($,heading);
    const references=parseReferences($,body,sourceUrl);
    articles[article]={
      article,
      title:articleTitle(headingText),
      references,
      judgmentCount:references.filter(x=>x.type==="judgment").length,
      lawCount:references.filter(x=>x.type==="law").length
    };
  });
  return {lawId,lawName,sourceUrl,articles,articleCount:Object.keys(articles).length};
}

export function __test(){return {articleTitle,referenceType,normalizeKind};}
