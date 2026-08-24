import path from "node:path";
import {fileURLToPath} from "node:url";
import {readJson} from "./lib/fs.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const rt=await readJson(path.join(ROOT,"data/runtime.json"));
const criminalMemory=await readJson(path.join(ROOT,"data/memory/criminal-memory.json"),null);
const errors=[];
if(!rt?.frontend?.data?.laws?.length) errors.push("runtime laws empty");
if(!rt?.frontend?.data?.court?.length) errors.push("runtime court empty");
if(!rt?.frontend?.sixLaws?.coverage) errors.push("runtime 6laws index missing");
if((rt?.sync?.court?.count||0)<1) errors.push("court sync count < 1");
if(!criminalMemory?.articles||Number(criminalMemory.total)!==422) errors.push("criminal memory pack total is not 422");
if(Number(criminalMemory?.active)!==402||Number(criminalMemory?.deleted)!==20) errors.push("criminal memory pack active/deleted counts are not 402/20");
for(const l of rt.frontend.data.laws){
  if(!l.id||!l.name||!l.pcode) errors.push(`bad law record ${JSON.stringify(l)}`);
}
for(const law of Object.values(rt.frontend.sixLaws?.laws||{})){
  if(law.matched&&!law.sourceUrl) errors.push(`6laws matched law missing source URL: ${law.lawId}`);
  if(law.matched&&Number(law.articleCount||0)<1) errors.push(`6laws matched law has no articles: ${law.lawId}`);
}
for(const [key,card] of Object.entries(rt.frontend.mnemonics||{})){
  const serialized=JSON.stringify(card);
  if(serialized.includes("[object Object]")) errors.push(`mnemonic contains object string: ${key}`);
}
const criminalCards=Object.entries(rt.frontend.mnemonics||{}).filter(([key])=>key.startsWith("criminal:"));
if(criminalCards.length!==Number(criminalMemory?.total||0)) errors.push(`criminal mnemonic catalog count mismatch: ${criminalCards.length}`);
for(const [article,item] of Object.entries(criminalMemory?.articles||{})){
  const card=rt.frontend.mnemonics?.[`criminal:${article}`];
  if(!card) errors.push(`criminal mnemonic missing: ${article}`);
  else if(card.chant!==item.memory10s||card.recallQuestion!==item.recallQuestion) errors.push(`criminal mnemonic source mismatch: ${article}`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("validation ok");
