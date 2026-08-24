import path from "node:path";
import {fileURLToPath} from "node:url";
import {readJson} from "./lib/fs.mjs";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const rt=await readJson(path.join(ROOT,"data/runtime.json"));
const errors=[];
if(!rt?.frontend?.data?.laws?.length) errors.push("runtime laws empty");
if(!rt?.frontend?.data?.court?.length) errors.push("runtime court empty");
if(!rt?.frontend?.sixLaws?.coverage) errors.push("runtime 6laws index missing");
if((rt?.sync?.court?.count||0)<1) errors.push("court sync count < 1");
for(const l of rt.frontend.data.laws){
  if(!l.id||!l.name||!l.pcode) errors.push(`bad law record ${JSON.stringify(l)}`);
}
for(const law of Object.values(rt.frontend.sixLaws?.laws||{})){
  if(law.matched&&!law.sourceUrl) errors.push(`6laws matched law missing source URL: ${law.lawId}`);
  if(law.matched&&Number(law.articleCount||0)<1) errors.push(`6laws matched law has no articles: ${law.lawId}`);
}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("validation ok");
