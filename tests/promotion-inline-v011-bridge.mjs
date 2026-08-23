
const KEY="police-promotion-warroom-v011";
const PREVKEY_V010="police-promotion-warroom-v010";
const PREVKEY_V09="police-promotion-warroom-v09";
const PREVKEY_V08="police-promotion-warroom-v08";
const PREVKEY_V07="police-promotion-warroom-v07";
const PREVKEY_V06="police-promotion-warroom-v06";
const PREVKEY_V05="police-promotion-warroom-v05";
const PREVKEY="police-promotion-sim-v04";
const $=id=>document.getElementById(id);
const today=new Date();
const currentROC=today.getFullYear()-1911;
const history={
  115:{applicants:310,slots:60,rate:19.35,cutoff:69.19,maxWritten:325.47,maxQual:201.40},
  114:{applicants:357,slots:65,rate:18.20,cutoff:64.47,maxWritten:305.14,maxQual:210.45},
  113:{applicants:220,slots:80,rate:36.36,cutoff:59.14,maxWritten:303.87,maxQual:192.15},
  112:{applicants:253,slots:65,rate:25.69,cutoff:57.90,maxWritten:322.93,maxQual:209.96},
  111:{applicants:356,slots:80,rate:22.47,cutoff:66.73,maxWritten:300.27,maxQual:187.24}
};
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random())}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function fmt(v){return (Math.round(num(v)*100)/100).toFixed(2)}
function rocDate(iso){
  if(!iso)return "—"; const d=new Date(iso+"T00:00:00"); if(isNaN(d))return "—";
  return `${d.getFullYear()-1911}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
}
function defaultPerf(){
  const arr=[]; for(let y=currentROC-7;y<=currentROC-1;y++)arr.push({id:uid(),year:y,grade:""}); return arr;
}
function defaultAwards(){
  const arr=[]; for(let y=currentROC-7;y<=currentROC;y++)arr.push({id:uid(),year:y,reward:0,merit:0,bigMerit:0,policeMedal:0,admonition:0,demerit:0,bigDemerit:0}); return arr;
}
let state={
  theme:"light",tab:"dashboard",
  base:{edu:0,examLevel:0,nonSupMonths:0,supMonths:0,training:0,language:0,otherAdd:0,legacyAdj:0,sequence:"",subjectiveScore:0,officialScore:"",officialDate:""},
  performance:defaultPerf(),awards:defaultAwards(),
  future:{
    targetYear:currentROC+1,cutoffDate:`${today.getFullYear()}-11-30`,rewardGoal:150,forecastWritten:280,
    reward:0,merit:0,bigMerit:0,nonSupMonths:12,supMonths:0,performance:0,safetyMargin:0,targetLinePercent:0,refYear:115,targetQual:200
  }
};
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function load(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw) state={...state,...JSON.parse(raw)};
    else{
      const prev010=localStorage.getItem(PREVKEY_V010);
      if(prev010){
        const p010=JSON.parse(prev010);
        state={...state,...p010};
      }
      const prev09=localStorage.getItem(PREVKEY_V09);
      if(prev09){
        const p09=JSON.parse(prev09);
        state={...state,...p09};
      }
      const prev08=localStorage.getItem(PREVKEY_V08);
      if(prev08){
        const p08=JSON.parse(prev08);
        state={...state,...p08};
      }
      const prev07=!prev08?localStorage.getItem(PREVKEY_V07):null;
      if(prev07){
        const p07=JSON.parse(prev07);
        state={...state,...p07};
      }
      const prev06=!prev07?localStorage.getItem(PREVKEY_V06):null;
      if(prev06){
        const p06=JSON.parse(prev06);
        state={...state,...p06};
      }
      const prev05=!prev06?localStorage.getItem(PREVKEY_V05):null;
      if(prev05){
        const p05=JSON.parse(prev05);
        state={...state,...p05};
        state.base={...state.base,...(p05.base||{}),officialScore:"",officialDate:""};
      }
      const prev=!prev05?localStorage.getItem(PREVKEY):null;
      if(prev){
        const o=JSON.parse(prev);
        if(o.score){
          state.base.edu=num(o.score.edu);state.base.examLevel=num(o.score.exam);state.base.nonSupMonths=num(o.score.nonSupMonths);
          state.base.supMonths=num(o.score.supMonths);state.base.training=num(o.score.training);state.base.language=num(o.score.language);
          state.base.otherAdd=num(o.score.otherAdd);state.base.legacyAdj=num(o.score.performanceScore)+num(o.score.awardScore)+num(o.score.manualAdj);
          state.base.sequence=o.score.sequence||"";state.base.subjectiveScore=num(o.score.subjectiveScore);
        }
        if(o.future){
          state.future.targetYear=num(o.future.targetYear)||currentROC+1;
          state.future.rewardGoal=150;state.future.reward=num(o.future.reward);state.future.merit=num(o.future.merit);state.future.bigMerit=num(o.future.bigMerit);
          state.future.nonSupMonths=num(o.future.nonSupMonths);state.future.supMonths=num(o.future.supMonths);
          state.future.performance=num(o.future.performance);state.future.forecastWritten=num(o.exam?.myWritten)||280;
          state.future.refYear=num(o.exam?.refYear)||115;
        }
        state.theme=o.theme||"light";
      }
    }
  }catch(e){}
  state.base={edu:0,examLevel:0,nonSupMonths:0,supMonths:0,training:0,language:0,otherAdd:0,legacyAdj:0,sequence:"",subjectiveScore:0,...(state.base||{})};
  state.performance=Array.isArray(state.performance)&&state.performance.length?state.performance:defaultPerf();
  state.awards=Array.isArray(state.awards)&&state.awards.length?state.awards:defaultAwards();
  state.awards=state.awards.map(r=>({policeMedal:0,...r}));
  state.future={targetYear:currentROC+1,cutoffDate:`${today.getFullYear()}-11-30`,rewardGoal:150,forecastWritten:280,reward:0,merit:0,bigMerit:0,nonSupMonths:12,supMonths:0,performance:0,safetyMargin:0,targetLinePercent:0,refYear:115,targetQual:200,...(state.future||{})};
  hydrate(); render();
}
function hydrate(){
  document.documentElement.dataset.theme=state.theme==="dark"?"dark":"light";
  Object.keys(state.base).forEach(k=>{if($(k))$(k).value=state.base[k]});
  if($("officialScore")) $("officialScore").value=state.base.officialScore??"";
  if($("officialDate")) $("officialDate").value=state.base.officialDate??"";
  const f=state.future;
  $("targetYear").value=f.targetYear;$("cutoffDate").value=f.cutoffDate;$("rewardGoal").value=f.rewardGoal;$("forecastWritten").value=f.forecastWritten;
  $("futureReward").value=f.reward;$("futureMerit").value=f.merit;$("futureBigMerit").value=f.bigMerit;$("futureNonSupMonths").value=f.nonSupMonths;
  $("futureSupMonths").value=f.supMonths;$("futurePerformance").value=f.performance;
  if($("targetLinePercent")) $("targetLinePercent").value=f.targetLinePercent??0;
  $("targetQualScore").value=f.targetQual;
  $("refYear").innerHTML=Object.keys(history).sort((a,b)=>b-a).map(y=>`<option value="${y}">${y}年</option>`).join("");
  $("refYear").value=f.refYear;
  if($("dashboardRewardGoal")) $("dashboardRewardGoal").value=f.rewardGoal;
  setTab(state.tab||"dashboard");
}
function setTab(tab){
  state.tab=tab;
  ["dashboard","data","future","exam"].forEach(t=>$(t+"Tab").classList.toggle("hidden",t!==tab));
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab)); save();
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

function perfRaw(grade){return grade==="甲"?3:grade==="乙"?2:0}
function awardRaw(r){return num(r.reward)*.1+num(r.merit)*.3+num(r.bigMerit)+num(r.policeMedal)*2-num(r.admonition)*.1-num(r.demerit)*.3-num(r.bigDemerit)}
function weightForYear(year,anchorYear){
  year=num(year); anchorYear=num(anchorYear);
  return year>=anchorYear-4 && year<=anchorYear ? 1 : (year<anchorYear-4 ? .5 : 0);
}
function cutoffYear(){const d=new Date(state.future.cutoffDate+"T00:00:00"); return isNaN(d)?currentROC:d.getFullYear()-1911}
function latestCompletedPerfYear(anchorYear){
  return anchorYear-1;
}
function currentAnchorYear(){return currentROC}
function calculateAt(anchorYear,includeFuture=false){
  const b=state.base;
  const perfAnchor=latestCompletedPerfYear(anchorYear);
  const perf=state.performance.reduce((s,r)=>s+perfRaw(r.grade)*weightForYear(r.year,perfAnchor),0);
  const awards=state.awards.reduce((s,r)=>s+awardRaw(r)*weightForYear(r.year,anchorYear),0);
  const service=num(b.nonSupMonths)*.1+num(b.supMonths)*.15;
  let total=num(b.edu)+num(b.examLevel)+service+Math.min(4,num(b.training))+Math.min(4,num(b.language))+num(b.otherAdd)+num(b.legacyAdj)+perf+awards;
  const parts={edu:num(b.edu),exam:num(b.examLevel),service,training:Math.min(4,num(b.training)),language:Math.min(4,num(b.language)),other:num(b.otherAdd)+num(b.legacyAdj),perf,awards};
  if(includeFuture){
    const f=state.future;
    const futureAwards=num(f.reward)*.1+num(f.merit)*.3+num(f.bigMerit);
    const futureService=num(f.nonSupMonths)*.1+num(f.supMonths)*.15;
    const futurePerf=num(f.performance);
    total+=futureAwards+futureService+futurePerf;
    parts.futureAwards=futureAwards;parts.futureService=futureService;parts.futurePerf=futurePerf;
  }
  return {total,parts};
}
function promotionFrom(migration){
  const seq=num(state.base.sequence); if(seq<7||seq>11)return null;
  let common=migration*.8;if(seq<=10)common=Math.min(common,80);
  return {common,total:common+num(state.base.subjectiveScore)};
}
function currentCalc(){return calculateAt(currentAnchorYear(),false)}
function futureCalc(){return calculateAt(cutoffYear(),true)}

function renderPerf(){
  const anchor=latestCompletedPerfYear(currentAnchorYear()),body=$("perfRows");body.innerHTML="";
  [...state.performance].sort((a,b)=>b.year-a.year).forEach(r=>{
    const w=weightForYear(r.year,anchor),raw=perfRaw(r.grade),tr=document.createElement("tr");
    tr.innerHTML=`<td>${r.year}</td><td><select data-p="${r.id}">
      <option value="" ${r.grade===""?"selected":""}>未填</option><option value="甲" ${r.grade==="甲"?"selected":""}>甲等</option><option value="乙" ${r.grade==="乙"?"selected":""}>乙等</option>
    </select></td><td>${fmt(raw)}</td><td>${w===1?"×1":w===.5?"×0.5":"未採"}</td><td><b>${fmt(raw*w)}</b></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("[data-p]").forEach(x=>x.onchange=()=>{const r=state.performance.find(r=>r.id===x.dataset.p);if(r)r.grade=x.value;save();render()});
}
function renderAwards(){
  const anchor=currentAnchorYear(),body=$("awardRows");body.innerHTML="";
  [...state.awards].sort((a,b)=>b.year-a.year).forEach(r=>{
    const w=weightForYear(r.year,anchor),raw=awardRaw(r),tr=document.createElement("tr");
    tr.innerHTML=`<td><b>${r.year}</b></td>
    ${["reward","merit","bigMerit","policeMedal","admonition","demerit","bigDemerit"].map(k=>`<td><input style="min-width:64px" type="number" min="0" step="1" value="${num(r[k])}" data-a="${r.id}" data-k="${k}"></td>`).join("")}
    <td>${fmt(raw)}</td><td>${w===1?"×1":"×0.5"}</td><td><b>${fmt(raw*w)}</b></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("[data-a]").forEach(x=>x.onchange=()=>{const r=state.awards.find(r=>r.id===x.dataset.a);if(r)r[x.dataset.k]=num(x.value);save();render()});
}
function currentYearRewards(){
  const r=state.awards.find(r=>num(r.year)===currentROC);return r?num(r.reward):0;
}
function currentYearAwardRow(){
  let r=state.awards.find(r=>num(r.year)===currentROC);
  if(!r){r={id:uid(),year:currentROC,reward:0,merit:0,bigMerit:0,policeMedal:0,admonition:0,demerit:0,bigDemerit:0};state.awards.push(r);}
  if(r.policeMedal==null) r.policeMedal=0;
  return r;
}
function syncCurrentYearQuickInputs(){
  const r=currentYearAwardRow();
  if($("cyQuickYear")) $("cyQuickYear").textContent=currentROC;
  if($("cyRewardInput")) $("cyRewardInput").value=num(r.reward);
  if($("cyMeritInput")) $("cyMeritInput").value=num(r.merit);
  if($("cyBigMeritInput")) $("cyBigMeritInput").value=num(r.bigMerit);
  if($("cyPoliceMedalInput")) $("cyPoliceMedalInput").value=num(r.policeMedal);
  if($("cyAwardPoints")) $("cyAwardPoints").textContent=fmt(awardRaw(r));
  if($("cyGoalMini")) $("cyGoalMini").textContent=`${num(r.reward)} / ${num(state.future.rewardGoal)}`;
}
function examScore(qual,written,year){
  const h=history[year]; if(!h)return null;
  return {total:(num(written)/h.maxWritten)*50+(num(qual)/h.maxQual)*50,wp:(num(written)/h.maxWritten)*50,qp:(num(qual)/h.maxQual)*50,h};
}
function effectiveTargetLine(year){
  const h=history[num(year)]||history[115];
  const pct=num(state.future.targetLinePercent);
  return h.cutoff*(1+pct/100);
}
function requiredWrittenFor(qual,target,year){
  const h=history[year]; if(!h)return 0;
  const qp=(num(qual)/h.maxQual)*50;
  return Math.max(0,(num(target)-qp)*h.maxWritten/50);
}


function renderCalibration(){
  const c=currentCalc().total;
  const official=state.base.officialScore===""?null:num(state.base.officialScore);
  if($("calculatedScore")) $("calculatedScore").value=fmt(c);
  if(official===null){
    if($("calibrationDiff")) $("calibrationDiff").value="—";
    if($("calibrationStatus")){
      $("calibrationStatus").className="callout warn";
      $("calibrationStatus").textContent="尚未輸入人事正式資績。";
    }
    return;
  }
  const diff=c-official;
  if($("calibrationDiff")) $("calibrationDiff").value=`${diff>=0?"+":""}${fmt(diff)}`;
  if($("calibrationStatus")){
    const ok=Math.abs(diff)<0.005;
    $("calibrationStatus").className=`callout ${ok?"good":"warn"}`;
    $("calibrationStatus").textContent=ok?"系統計算與人事正式資績完全吻合。":`目前差異 ${diff>=0?"+":""}${fmt(diff)} 分，建議檢查歷年考績、獎懲、年資或補正欄位。`;
  }
}

function renderData(){
  const c=currentCalc(),p=promotionFrom(c.total);
  $("currentMigration").textContent=fmt(c.total);
  if(p){$("currentPromotion").textContent=fmt(p.total);$("currentPromotionNote").textContent=`共同選項 ${fmt(p.common)} ＋ 個別/綜合 ${fmt(state.base.subjectiveScore)}`}
  else{$("currentPromotion").textContent="—";$("currentPromotionNote").textContent="請選擇第七至第十一序列。"}
  renderPerf();renderAwards();
}
function renderFuture(){
  const c=currentCalc(),f=futureCalc(),delta=f.total-c.total,p=promotionFrom(f.total);
  $("futureYearLabel").textContent=state.future.targetYear;$("futureMigration").textContent=fmt(f.total);
  $("futureDelta").textContent=`較目前 ${delta>=0?"+":""}${fmt(delta)}`;$("futureDelta").className=delta>=0?"positive":"negative";
  $("futureCutoffPill").textContent=rocDate(state.future.cutoffDate);
  if(p){$("futurePromotion").textContent=fmt(p.total);$("futurePromotionNote").textContent=`共同選項 ${fmt(p.common)} ＋ 個別/綜合 ${fmt(state.base.subjectiveScore)}`}
  else{$("futurePromotion").textContent="—";$("futurePromotionNote").textContent="請先在積分資料選擇序列。"}
  const baseAtFuture=calculateAt(cutoffYear(),false);
  const rollover=baseAtFuture.total-c.total;
  const bf=[
    ["目前資績",c.total],["跨年度自動重算",rollover],["額外嘉獎/記功/大功",f.parts.futureAwards||0],
    ["新增年資",f.parts.futureService||0],["新增考績",f.parts.futurePerf||0],["目標年度資績",f.total]
  ];
  $("futureBreakdown").innerHTML=bf.map(([k,v],i)=>`<div class="breakdown"><span>${i===bf.length-1?"<b>"+k+"</b>":k}</span><b class="${v<0?"negative":""}">${i>0&&i<bf.length-1?(v>=0?"+":""):""}${fmt(v)}</b></div>`).join("");
  const gap=num(state.future.targetQual)-f.total;$("neededRewards").textContent=gap<=0?"已達標":`${Math.ceil(gap/.1)} 支`;
}
function renderExam(){
  const f=futureCalc(),written=num(state.future.forecastWritten),yr=num(state.future.refYear),e=examScore(f.total,written,yr),safe=effectiveTargetLine(yr);
  $("examQualView").textContent=fmt(f.total);$("examWrittenView").textContent=fmt(written);$("examRefView").textContent=`${yr}年`;
  $("writtenPart").textContent=fmt(e.wp);$("qualPart").textContent=fmt(e.qp);$("cutoffView").textContent=fmt(e.h.cutoff);$("safeCutoffView").textContent=fmt(safe);
  if($("targetPctView")) $("targetPctView").textContent=`+${fmt(state.future.targetLinePercent)}%`;
  $("examTotal").textContent=fmt(e.total);
  const sm=e.total-safe;$("safeMarginView").textContent=`${sm>=0?"+":""}${fmt(sm)}`;$("safeMarginView").className=sm>=0?"positive":"negative";
  $("examStatus").className=`callout ${sm>=0?"good":"warn"}`;$("examStatus").textContent=sm>=0?`高於目標線 ${fmt(sm)} 分。`:`距目標線尚差 ${fmt(Math.abs(sm))} 分。`;
  const req=requiredWrittenFor(f.total,safe,yr);$("requiredWritten").textContent=`${fmt(req)} 分`;
  $("requiredWrittenNote").textContent=`以${yr}年最高分結構，要達目標線 ${fmt(safe)}，筆試約需 ${fmt(req)} 分。`;
  $("requiredProgress").style.width=`${Math.min(100,req/history[yr].maxWritten*100)}%`;

  let pass=0;
  $("scenarioRows").innerHTML=Object.keys(history).sort((a,b)=>b-a).map(y=>{
    const s=examScore(f.total,written,num(y)),margin=s.total-s.h.cutoff;if(margin>=0)pass++;
    return `<tr><td><b>${y}年</b></td><td>${fmt(s.h.cutoff)}</td><td>${fmt(s.h.maxWritten)}</td><td>${fmt(s.h.maxQual)}</td><td><b>${fmt(s.total)}</b></td><td class="${margin>=0?"positive":"negative"}">${margin>=0?"+":""}${fmt(margin)}</td><td>${margin>=0?"通過":"未過"}</td></tr>`;
  }).join("");

  const g10r=50/history[yr].maxQual, g50r=5*50/history[yr].maxQual, g5w=5*50/history[yr].maxWritten, g10w=10*50/history[yr].maxWritten;
  $("examGain10Rewards").textContent=`總成績 +${fmt(g10r)}`;$("examGain50Rewards").textContent=`總成績 +${fmt(g50r)}`;
  $("examGain5Written").textContent=`總成績 +${fmt(g5w)}`;$("examGain10Written").textContent=`總成績 +${fmt(g10w)}`;
  $("efficiencyNote").textContent=`${yr}年結構下，每增加1資績分約增加總成績 ${fmt(50/history[yr].maxQual)}；每增加1筆試原始分約增加 ${fmt(50/history[yr].maxWritten)}。`;

  $("historyRows").innerHTML=Object.keys(history).sort((a,b)=>b-a).map(y=>{const h=history[y];return `<tr><td>${y}</td><td>${h.applicants}</td><td>${h.slots}</td><td>${h.rate.toFixed(2)}%</td><td>${fmt(h.cutoff)}</td><td>${fmt(h.maxWritten)}</td><td>${fmt(h.maxQual)}</td></tr>`}).join("");
}
function renderDashboard(){
  const c=currentCalc(),f=futureCalc(),delta=f.total-c.total,yr=num(state.future.refYear),written=num(state.future.forecastWritten);
  $("dashTargetYear").textContent=state.future.targetYear;
  $("dashFutureQual").textContent=fmt(f.total);
  $("dashCurrentQual").textContent=fmt(c.total);
  const official=state.base.officialScore===""?null:num(state.base.officialScore);
  $("dashOfficialScore").textContent=official===null?"—":fmt(official);
  if(official===null){
    $("dashCalibrationDiff").textContent="—";
    $("dashOfficialStatus").className="callout warn";
    $("dashOfficialStatus").textContent="尚未輸入人事正式資績。";
  }else{
    const d=c.total-official;
    $("dashCalibrationDiff").textContent=`${d>=0?"+":""}${fmt(d)}`;
    $("dashOfficialStatus").className=`callout ${Math.abs(d)<0.005?"good":"warn"}`;
    $("dashOfficialStatus").textContent=Math.abs(d)<0.005?"人事正式資績與系統計算完全吻合。":`系統與人事差 ${d>=0?"+":""}${fmt(d)} 分。`;
  }

  const cutoff=new Date(state.future.cutoffDate+"T23:59:59"),days=Math.ceil((cutoff-today)/86400000);
  $("daysLeft").textContent=days>=0?`${days} 天`:"已截止";$("daysLeftNote").textContent=days>=0?`以預估截止日 ${rocDate(state.future.cutoffDate)} 計算。`:"請更新截止日。";

  const cy=state.awards.find(r=>num(r.year)===currentROC)||{reward:0,merit:0,bigMerit:0,admonition:0,demerit:0,bigDemerit:0};
  $("dashCYReward").textContent=num(cy.reward);
  $("dashCYMerit").textContent=num(cy.merit);
  $("dashCYBigMerit").textContent=num(cy.bigMerit);
  if($("dashCYPoliceMedal")) $("dashCYPoliceMedal").textContent=num(cy.policeMedal);
  $("dashCYAwardScore").textContent=fmt(awardRaw(cy));

  const got=currentYearRewards(),goal=Math.max(0,num(state.future.rewardGoal)),remain=Math.max(0,goal-got),pct=goal?Math.min(100,got/goal*100):0;
  if($("dashboardRewardGoal") && document.activeElement!==$("dashboardRewardGoal")) $("dashboardRewardGoal").value=goal;
  $("goalProgressText").textContent=`${got} / ${goal}`;$("goalPercent").textContent=`${fmt(pct)}%`;$("goalProgressBar").style.width=`${pct}%`;
  if($("goalProgressTextMirror")) $("goalProgressTextMirror").textContent=`${got} / ${goal}`;
  const months=Math.max(1,days/30.44);$("goalPaceText").textContent=remain<=0?"年度嘉獎目標已達成。":`尚差 ${remain} 支；若要在截止日前完成，平均每月約需 ${fmt(remain/months)} 支。`;

  let pass=0;Object.keys(history).forEach(y=>{if(examScore(f.total,written,num(y)).total>=history[y].cutoff)pass++});
  $("historyPassRate").textContent=`${pass}/5`;$("historyPassNote").textContent=`以資績 ${fmt(f.total)}、筆試 ${fmt(written)} 回測111～115年，有 ${pass} 個年度高於最低錄取線。`;

  const safe=effectiveTargetLine(yr),req=requiredWrittenFor(f.total,safe,yr);
  $("dashRequiredWritten").textContent=`${fmt(req)} 分`;$("dashRequiredNote").textContent=`以${yr}年結構、目標線 ${fmt(safe)} 反算。`;

  $("gain10Rewards").textContent=`總成績 +${fmt(50/history[yr].maxQual)}`;
  $("gain10Written").textContent=`總成績 +${fmt(10*50/history[yr].maxWritten)}`;
  $("gain1Qual").textContent=`+${fmt(50/history[yr].maxQual)}`;
  $("gain1Written").textContent=`+${fmt(50/history[yr].maxWritten)}`;

  const e=examScore(f.total,written,yr),margin=e.total-safe;
  if($("dashExamTotal")) $("dashExamTotal").textContent=fmt(e.total);
  if($("dashExamStatus")){
    $("dashExamStatus").textContent=margin>=0?`高於目標線 ${fmt(margin)} 分`:`距目標線 ${fmt(Math.abs(margin))} 分`;
    $("dashExamStatus").className=`kpi-foot ${margin>=0?"positive":"warn"}`;
  }
  let txt="";
  if(margin>=3)txt=`目前情境下，以${yr}年結構估算總成績 ${fmt(e.total)}，高於目標線 ${fmt(margin)} 分；可優先把重心放在維持筆試與確保預計嘉獎確實在截止日前核定。`;
  else if(margin>=0)txt=`目前約在目標線附近，緩衝只有 ${fmt(margin)} 分。建議同時保留嘉獎與筆試兩條路，不要只壓單一變數。`;
  else txt=`目前距目標線約 ${fmt(Math.abs(margin))} 分。若資績不變，筆試約需 ${fmt(req)}；若筆試維持 ${fmt(written)}，則可再透過嘉獎、記功、年資等提高資績。`;
  $("quickConclusion").className=`callout ${margin>=0?"good":"warn"}`;$("quickConclusion").textContent=txt;
}
function render(){renderCalibration();renderData();renderFuture();renderExam();renderDashboard();syncCurrentYearQuickInputs()}

Object.keys(state.base).filter(k=>!["officialScore","officialDate"].includes(k)).forEach(k=>{if($(k))$(k).addEventListener("change",()=>{state.base[k]=$(k).value;save();render()})});
if($("dashboardRewardGoal")){
  $("dashboardRewardGoal").addEventListener("change",()=>{
    state.future.rewardGoal=Math.max(0,num($("dashboardRewardGoal").value));
    $("rewardGoal").value=state.future.rewardGoal;
    save();render();
  });
}

[
  ["targetYear","targetYear"],["cutoffDate","cutoffDate"],["rewardGoal","rewardGoal"],["forecastWritten","forecastWritten"],
  ["futureReward","reward"],["futureMerit","merit"],["futureBigMerit","bigMerit"],["futureNonSupMonths","nonSupMonths"],
  ["futureSupMonths","supMonths"],["futurePerformance","performance"],["targetLinePercent","targetLinePercent"],["refYear","refYear"],["targetQualScore","targetQual"]
].forEach(([id,key])=>$(id).addEventListener("change",()=>{
  state.future[key]=$(id).value;
  if(key==="rewardGoal" && $("dashboardRewardGoal")) $("dashboardRewardGoal").value=state.future.rewardGoal;
  save();render();
}));

$("fillToGoal").onclick=()=>{
  const got=currentYearRewards(),remain=Math.max(0,num(state.future.rewardGoal)-got);
  state.future.reward=remain;$("futureReward").value=remain;save();render();
};
$("setDefaultCutoff").onclick=()=>{state.future.cutoffDate=`${today.getFullYear()}-11-30`;$("cutoffDate").value=state.future.cutoffDate;save();render()};

$("saveCurrentYearAwards").onclick=()=>{
  const r=currentYearAwardRow();
  r.reward=Math.max(0,num($("cyRewardInput").value));
  r.merit=Math.max(0,num($("cyMeritInput").value));
  r.bigMerit=Math.max(0,num($("cyBigMeritInput").value));
  r.policeMedal=Math.max(0,num($("cyPoliceMedalInput").value));
  save();render();
};
$("addOneReward").onclick=()=>{const r=currentYearAwardRow();r.reward=num(r.reward)+1;save();render();};
$("addOneMerit").onclick=()=>{const r=currentYearAwardRow();r.merit=num(r.merit)+1;save();render();};

$("saveOfficial").onclick=()=>{
  state.base.officialScore=$("officialScore").value;
  state.base.officialDate=$("officialDate").value;
  save();render();
};

$("load8655Case").onclick=()=>{
  state.base.edu=7;
  state.base.examLevel=3;
  state.base.nonSupMonths=84;
  state.base.supMonths=0;
  state.base.training=2;
  state.base.language=1;
  state.base.otherAdd=0;
  state.base.legacyAdj=65.15;
  state.base.officialScore=86.55;
  state.base.officialDate="";
  state.performance=defaultPerf().map(r=>({...r,grade:""}));
  state.awards=defaultAwards().map(r=>({...r,reward:0,merit:0,bigMerit:0,policeMedal:0,admonition:0,demerit:0,bigDemerit:0}));
  hydrate();save();render();
};

$("themeBtn").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=state.theme;save()};
$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download=`警察升遷戰情室_V0.11_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
};
$("importBtn").onclick=()=>$("importFile").click();
$("importFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{state={...state,...JSON.parse(await f.text())};save();location.reload()}catch(err){alert("備份檔格式錯誤")}};
$("clearBtn").onclick=()=>{if(confirm("確定清除全部資料？")){localStorage.removeItem(KEY);location.reload()}};

load();


(function(){
  function summary(){
    try{
      const c=currentCalc(), f=futureCalc();
      const yr=num(state.future.refYear), written=num(state.future.forecastWritten);
      const e=examScore(f.total,written,yr);
      const cy=(state.awards||[]).find(r=>num(r.year)===currentROC)||{};
      const official=state.base.officialScore===""?null:num(state.base.officialScore);
      const goal=Math.max(0,num(state.future.rewardGoal));
      const reward=num(cy.reward);
      const safe=effectiveTargetLine(yr);
      return {
        officialScore:official,
        currentQual:c.total,
        futureQual:f.total,
        targetYear:num(state.future.targetYear),
        reward,
        rewardGoal:goal,
        rewardPct:goal?Math.min(100,reward/goal*100):0,
        forecastWritten:written,
        examTotal:e?e.total:null,
        targetLine:safe,
        examMargin:e?e.total-safe:null,
        refYear:yr,
        requiredWritten:requiredWrittenFor(f.total,safe,yr),
        updatedAt:new Date().toISOString()
      };
    }catch(err){
      return {error:String(err)};
    }
  }
  window.getLexCorePromotionSummary=summary;

  function notify(){
    try{
      parent.postMessage({
        type:"lexcore-promotion-update",
        summary:summary(),
        height:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)
      },"*");
    }catch(e){}
  }

  try{
    const originalSave=save;
    save=function(){
      originalSave();
      setTimeout(notify,0);
    };
  }catch(e){}

  window.addEventListener("load",()=>setTimeout(notify,50));
  window.addEventListener("resize",()=>setTimeout(notify,20));
  try{
    new ResizeObserver(()=>notify()).observe(document.body);
  }catch(e){}
  setTimeout(notify,120);
})();
