import path from "node:path";
import {fileURLToPath} from "node:url";
import {readJson,writeJsonAtomic} from "./lib/fs.mjs";
import {fetchText,politeDelay} from "./lib/http.mjs";
import {parseSixLawsPage} from "./lib/sixlaws.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url)),ROOT=path.resolve(HERE,"..");
const cfg=await readJson(path.join(ROOT,"config/laws.json"));
const sourceCfg=await readJson(path.join(ROOT,"config/sixlaws.json"));
const retrievedAt=new Date().toISOString();
const laws={};

for(const law of cfg.laws){
  const source=sourceCfg.laws?.[law.id]||null;
  const row={
    lawId:law.id,lawName:law.name,sourceName:source?.sourceName||null,
    sourceUrl:source?.url||null,matched:!!source?.url,retrievedAt:null,
    articleCount:0,articles:{},error:null,note:source?.note||null
  };
  if(!source?.url){
    row.error="6laws 未配置對應公開法條頁；不以猜測補資料。";
    laws[law.id]=row;
    continue;
  }
  try{
    const html=await fetchText(source.url,{timeoutMs:55000,retries:2});
    const parsed=parseSixLawsPage(html,{lawId:law.id,lawName:law.name,sourceUrl:source.url});
    row.retrievedAt=retrievedAt;
    row.articles=parsed.articles;
    row.articleCount=parsed.articleCount;
    if(!row.articleCount)throw new Error("找不到逐條 h2 條文標題");
    console.log(`[6laws] ${law.name}: ${row.articleCount} articles`);
  }catch(error){
    row.error=String(error?.message||error);
    console.warn(`[6laws] ${law.name}: ${row.error}`);
  }
  laws[law.id]=row;
  await politeDelay(160);
}

const matched=Object.values(laws).filter(x=>x.matched&&x.articleCount>0);
const output={
  schema:"lexcore.sixlaws.article-index.v1",
  provider:sourceCfg.provider,
  sourceBaseUrl:sourceCfg.baseUrl,
  retrievedAt,
  usage:sourceCfg.usage,
  coverage:{configured:Object.keys(sourceCfg.laws||{}).length,matched:matched.length,tracked:cfg.laws.length},
  laws
};
await writeJsonAtomic(path.join(ROOT,"data/sixlaws-article-index.json"),output);
console.log(`[6laws] matched=${matched.length}/${cfg.laws.length}, indexedArticles=${matched.reduce((n,x)=>n+x.articleCount,0)}`);
