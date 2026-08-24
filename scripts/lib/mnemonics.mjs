const CN_DIGITS={
  "零":0,"〇":0,"一":1,"二":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9
};

function compact(value=""){
  return String(value).replace(/\u00a0/g," ").replace(/\r/g,"\n").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}

function oneLine(value=""){
  return compact(value).replace(/\s*\n\s*/g," ").replace(/\s+/g," ").trim();
}

function shorten(value="",limit=56){
  const text=oneLine(value);
  if(text.length<=limit)return text;
  return `${text.slice(0,Math.max(1,limit-1))}…`;
}

function unique(values=[]){
  return [...new Set(values.map(oneLine).filter(Boolean))];
}

function chineseNumberToArabic(value=""){
  const text=String(value).trim();
  if(!text)return null;
  if(/^\d+$/.test(text))return Number(text);
  let total=0,current=0,unit=1;
  const units={"十":10,"百":100,"千":1000,"萬":10000,"万":10000};
  for(let i=text.length-1;i>=0;i--){
    const char=text[i];
    if(units[char]){
      const next=units[char];
      if(next>=10000){total=(total+current)*next;current=0;unit=1;}
      else {unit=next;if(current===0)current=1;total+=current*unit;current=0;}
    }else if(CN_DIGITS[char]!==undefined){current+=CN_DIGITS[char]*unit;unit=1;}
  }
  return total+current||null;
}

function extractNumberFragments(text=""){
  const rows=oneLine(text).match(/(?:不得逾|至遲|每|於|滿|未滿|逾|不逾|超過|至少|最多|新臺幣)?\s*(?:\d+(?:\.\d+)?|[零〇一二三四五六七八九十百千萬]+)(?:年內|日內|小時內|分鐘內|年|月|日|小時|分鐘|萬元|元|人|次|倍|歲)(?:以下|以上|前|後)?/g)||[];
  return unique(rows).slice(0,6);
}

function extractNumberedItems(text=""){
  const rows=[];
  const re=/(?:^|[。；\n])\s*([一二三四五六七八九十百千]+)、\s*(.*?)(?=(?:[。；\n]\s*[一二三四五六七八九十百千]+、)|(?:[。；]\s*\n\s*(?=[^一二三四五六七八九十百千\s、]))|$)/gs;
  for(const match of compact(text).matchAll(re)){
    rows.push({number:match[1],text:oneLine(match[2]).replace(/[。；]+$/g,"")});
  }
  return rows;
}

function itemLabel(value=""){
  const text=oneLine(value).replace(/^[一二三四五六七八九十百千]+、/g,"");
  const labelRules=[
    [/(無正當理由)?不到場.*拘提/,"不到場→拘提"],
    [/(姓名|性別|出生年月日|身分證明|住、居所)/,"身分資料"],
    [/案由/,"案由"],
    [/(應到|到場).*(日|時|處所)/,"到場時間地點"],
    [/(不到場|拘提)/,"不到場→拘提"],
    [/(通知書|通知).*詢問/,"通知到場詢問"],
    [/(檢察官|法官).*簽名|簽名/,"權責簽名"],
    [/(期間|期限|日內|月內|年內)/,"期間"],
    [/(不得|禁止)/,"禁止"],
    [/(得|可以)/,"授權"],
  ];
  const direct=labelRules.slice(0,6).find(([pattern])=>pattern.test(text));
  if(direct)return direct[1];
  const ruleHits=labelRules.filter(([pattern])=>pattern.test(text)).map(([,label])=>label);
  if(ruleHits.length)return unique(ruleHits).slice(0,2).join("／");
  const colon=text.search(/[：:]/);
  if(colon>0&&colon<=34)return shorten(text.slice(0,colon),24);
  const lead=text.split(/[，,；。]/)[0];
  if(lead.length<=28)return lead;
  const legalTerms=["放火","強制性交","強制猥褻","性影像","殺人","傷害","竊盜","搶奪","強盜","詐欺","恐嚇取財","擄人勒贖","槍砲","毒品","人口販運","組織犯罪","妨害自由","查證身分","噪音","深夜喧嘩"];
  const hits=legalTerms.filter(term=>text.includes(term));
  return hits.length?hits.slice(0,3).join("／"):shorten(lead,24);
}

function extractExceptions(text=""){
  const rows=compact(text).split(/(?<=[。！？；])/).map(oneLine).filter(Boolean);
  return unique(rows.filter(row=>/(但|除.+外|不在此限|未經|無正當理由|不得|不適用|急迫)/.test(row))).slice(0,3).map(row=>shorten(row,88));
}

function firstLine(text=""){
  return oneLine(compact(text).split("\n")[0]||text);
}

function buildOrder(text="",items=[]){
  if(items.length>=2){
    const labels=items.slice(0,8).map(item=>`${item.number}、${itemLabel(item.text)}`);
    if(items.length>8)labels.push(`其餘${items.length-8}款`);
    return labels.join(" → ");
  }
  const blocks=compact(text).split("\n").map(oneLine).filter(Boolean);
  if(blocks.length>=2)return blocks.slice(0,4).map(block=>shorten(block,34)).join(" → ");
  return shorten(firstLine(text),96);
}

function modalSignals(text=""){
  const signals=[];
  if(text.includes("不得"))signals.push("不得＝禁止");
  if(text.includes("應"))signals.push("應＝義務");
  if(text.includes("得"))signals.push("得＝法律授權／裁量");
  return signals;
}

function isUsefulMemory(value=""){
  const text=oneLine(value);
  return Boolean(text)&&!/(尚未人工編寫|自動同步資料|尚待人工整理|請開啟官方)/.test(text);
}

function frequencyCue(lawId,article,frequency){
  if(lawId!=="cpl")return "";
  const rows=Object.values(frequency?.views||{}).flatMap(view=>view?.issues||[])
    .filter(row=>(row.articleRefs||[]).map(String).includes(String(article)))
    .sort((a,b)=>(Number(b.count)||0)-(Number(a.count)||0));
  return unique(rows.slice(0,2).map(row=>`${row.issue}（${row.count}次）`)).join("；");
}

export function buildArticleMnemonic({key,record={},detail={},manual=null,frequency={}}={}){
  const lawId=record.lawId||detail.law_id||String(key||"").split(":")[0];
  const article=String(record.article||detail.article||String(key||"").split(":")[1]||"");
  const text=compact(record.text||detail.current||"");
  const items=extractNumberedItems(text);
  const numbers=extractNumberFragments(text);
  const exceptions=extractExceptions(text);
  const signals=modalSignals(text);
  const hasDetailMemory=isUsefulMemory(detail.memory);
  const hasManual=manual&&typeof manual==="object";
  const isDeleted=manual?.status==="deleted"||manual?.status==="刪除";
  const keyword=manual?.keyword||"";
  const order=manual?.order||buildOrder(text,items);
  const focus=manual?.focus||keyword||shorten(firstLine(text),100);
  const defaultChant=items.length>=2
    ?`${items.length}款順序：${items.slice(0,8).map(item=>`${item.number}${itemLabel(item.text)}`).join("→")}${items.length>8?"→其餘各款":""}`
    :`先抓主軸：${shorten(firstLine(text),72)}`;
  const chant=manual?.chant||manual?.memory10s||((hasDetailMemory?oneLine(detail.memory):defaultChant));
  const explain30s=manual?.explain30s||"";
  const trap=manual?.trap||"";
  const frequencyCueText=frequencyCue(lawId,article,frequency);
  const examCue=manual?.examCue||trap||detail?.exam?.[0]||frequencyCueText||(signals.length?`字眼辨識：${signals.join("；")}`:"先遮住條文，依理解順序回想後再核對原文。");
  const recall=manual?.recall||manual?.recallQuestion||`遮住現行條文，先說出「${shorten(chant,62)}」；再依序回想：${shorten(order,110)}。`;
  const exception=manual?.exception||exceptions.join("；");
  const manualKind=Boolean(hasManual||hasDetailMemory);
  const kind=isDeleted?"deleted":manualKind?"curated":text?"auto":"pending";
  const status=isDeleted?"現行已刪除／舊題版本風險":manualKind?"人工整理":text?"結構化草稿":"待同步";
  return {
    key:String(key||`${lawId}:${article}`),lawId,article,
    title:manual?.title||`${record.lawName||detail.law_name||"法規"} 第${article}條`,
    text:chant,chant,keyword,chapter:manual?.chapter||"",memory10s:manual?.memory10s||chant,
    explain30s,trap,recallQuestion:manual?.recallQuestion||recall,
    focus,order,numbers:manual?.numbers||numbers,exception,examCue,recall,
    priority:manual?.priority||"",needs_review:Boolean(manual?.needs_review),
    kind,status,
    source:manualKind?(manual?.source||(hasManual?"LexCore條文記憶卡":"LexCore人工整理")):(text?"官方現行全文結構化擷取":"尚無現行全文"),
    note:isDeleted?"本卡保留供舊題與版本風險辨識；不生成現行法構成要件，作答仍以官方現行全文為準。":manualKind?"記憶卡只做理解與背誦提示；作答前仍以現行條文逐字核對。":text?"由現行全文拆出主軸、順序、數字與例外；這是可修訂的結構化草稿，不把摘要當成法條。":"官方全文尚未進入目前離線快照。"
  };
}

export function buildMnemonicCatalog(articleTexts={},details={},manualCards={},frequency={}){
  const keys=new Set([...Object.keys(articleTexts||{}),...Object.keys(details||{}),...Object.keys(manualCards||{})]);
  const result={};
  for(const key of keys){
    const record=articleTexts[key]||{};
    result[key]=buildArticleMnemonic({key,record,detail:details[key]||{},manual:manualCards[key]||null,frequency});
  }
  return result;
}

export const __test={extractNumberFragments,extractNumberedItems,itemLabel,buildOrder,extractExceptions};
