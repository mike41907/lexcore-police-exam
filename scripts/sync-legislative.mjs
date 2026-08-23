import path from "node:path";
import {fileURLToPath} from "node:url";
import {readJson, writeJsonAtomic} from "./lib/fs.mjs";
import {fetchPaged} from "./lib/ly.mjs";
import {parseArticleNo, dice, compact, sessionTermsForRoc} from "./lib/text.mjs";

const HERE=path.dirname(fileURLToPath(import.meta.url)), ROOT=path.resolve(HERE,"..");
const cfg=await readJson(path.join(ROOT,"config/laws.json"));
const lawFiles={};
for(const law of cfg.laws) lawFiles[law.id]=await readJson(path.join(ROOT,`data/official/${law.id}.json`),{articles:{},windowEvents:[]});

function lawForTitle(title=""){
  return cfg.laws.find(l=>l.aliases.some(a=>String(title).includes(a)));
}
function normRows(payloadRows){
  return payloadRows.map(r=>({
    term:String(r.term??""),sessionPeriod:String(r.sessionPeriod??""),
    sessionTimes:String(r.sessionTimes??""),meetingTimes:String(r.meetingTimes??""),
    billNo:r.billNo??null,docNo:r.docNo??null,docUrl:r.docUrl??null,
    lawCompareTitle:r.lawCompareTitle??"",
    reviseLaw:r.reviseLaw??"",activeLaw:r.activeLaw??"",description:r.description??"",
    selectTerm:String(r.selectTerm??"")
  }));
}
function scoreCandidate(c, law, article, event){
  let score=0, why=[];
  if(law.aliases.some(a=>c.lawCompareTitle.includes(a))){score+=0.18;why.push("法名吻合");}
  const no=parseArticleNo(`${c.lawCompareTitle} ${c.reviseLaw}`);
  if(no===article){score+=0.22;why.push("條號吻合");}
  if(sessionTermsForRoc(event.rocYear).includes(c.selectTerm)){score+=0.18;why.push("屆期吻合");}
  const current=lawFiles[law.id]?.articles?.[article]?.text||"";
  if(current && c.reviseLaw){
    const sim=dice(current,c.reviseLaw);
    score += Math.min(0.32, sim*0.32);
    if(sim>=0.90)why.push(`修正後文字高度吻合${sim.toFixed(2)}`);
    else if(sim>=0.70)why.push(`修正後文字相似${sim.toFixed(2)}`);
  }
  if((c.description||"").length>20){score+=0.06;why.push("有說明");}
  if(c.docUrl){score+=0.04;why.push("有關係文書");}
  return {score:Math.min(1,score),why};
}

// Dataset 373: final third-reading text & attached resolutions, used as a final-pass anchor.
// A partial/failed fetch must never replace the last successful snapshot with empty data.
let finalPassed=[], finalFetchOk=false, finalFetchError="";
try{
  finalPassed=await fetchPaged(373,"all",10);
  finalFetchOk=true;
}catch(e){finalFetchError=e.message;console.warn("[LY373]",e.message);}
const finalFiltered=finalPassed.filter(r=>{
  const t=`${r.title||""} ${r.thirdReading||""}`;
  return cfg.laws.some(l=>l.aliases.some(a=>t.includes(a)));
});

// Dataset 19: article comparisons + description. Fetch only relevant recent sessions.
const terms=[];
for(let y=cfg.window.rocStart;y<=cfg.window.rocEnd;y++) terms.push(...sessionTermsForRoc(y));
const all=[];
let failedTerms=[];
for(const term of [...new Set(terms)]){
  try{
    console.log(`[LY19] ${term}`);
    const rows=normRows(await fetchPaged(19,term,80));
    all.push(...rows.filter(r=>lawForTitle(r.lawCompareTitle)));
  }catch(e){failedTerms.push({term,error:e.message});console.warn(`[LY19 ${term}] ${e.message}`);}
}

if(!finalFetchOk || failedTerms.length){
  const details=[finalFetchError&&`Dataset 373: ${finalFetchError}`,...failedTerms.map(x=>`Dataset 19 term ${x.term}: ${x.error}`)].filter(Boolean).join("\n");
  throw new Error(`Legislative Yuan sync incomplete; preserving previous snapshots.\n${details}`);
}

await writeJsonAtomic(path.join(ROOT,"data/legislative/third-reading.json"),{
  fetchedAt:new Date().toISOString(),sourceDataset:373,rows:finalFiltered
});
await writeJsonAtomic(path.join(ROOT,"data/legislative/comparison-candidates.json"),{
  fetchedAt:new Date().toISOString(),sourceDataset:19,rows:all
});

// Build best-match per amendment article, but publish only high-confidence reasons automatically.
const matches={};
const review=[];
for(const law of cfg.laws){
  for(const event of lawFiles[law.id]?.windowEvents||[]){
    for(const article of event.articles||[]){
      const candidates=all.filter(c=>{
        const lf=lawForTitle(c.lawCompareTitle);
        if(!lf || lf.id!==law.id) return false;
        const no=parseArticleNo(`${c.lawCompareTitle} ${c.reviseLaw}`);
        return no===article && sessionTermsForRoc(event.rocYear).includes(c.selectTerm);
      }).map(c=>({...c,...scoreCandidate(c,law,article,event)}))
        .sort((a,b)=>b.score-a.score);
      if(!candidates.length) continue;
      const best=candidates[0], key=`${law.id}:${event.rocDate}:${article}`;
      const status=best.score>=0.82 ? "auto-verified" : "needs-review";
      const item={key,lawId:law.id,lawName:law.name,eventDate:event.date,rocDate:event.rocDate,article,status,confidence:Number(best.score.toFixed(3)),evidence:best.why,
        previous:best.activeLaw,current:best.reviseLaw,reason:best.description,
        billNo:best.billNo,docNo:best.docNo,docUrl:best.docUrl,selectTerm:best.selectTerm,
        alternatives:candidates.slice(1,4).map(x=>({confidence:Number(x.score.toFixed(3)),billNo:x.billNo,docNo:x.docNo,docUrl:x.docUrl,reason:x.description}))
      };
      matches[key]=item;
      if(status==="needs-review") review.push(item);
    }
  }
}
await writeJsonAtomic(path.join(ROOT,"data/legislative/matches.json"),{
  fetchedAt:new Date().toISOString(),matches,reviewCount:review.length
});
await writeJsonAtomic(path.join(ROOT,"data/legislative/review-queue.json"),{
  fetchedAt:new Date().toISOString(),items:review
});
console.log(`[legislative] candidates=${all.length}, matched=${Object.keys(matches).length}, review=${review.length}`);
