export function normalizeSpace(s=""){
  return String(s).replace(/\u00a0/g," ").replace(/\r/g,"")
    .replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n").trim();
}
export function compact(s=""){
  return String(s).replace(/[\s　，。；：、,.!?！？「」『』（）()【】《》〈〉\-—–]/g,"");
}
export function htmlToText($){
  $("br").replaceWith("\n");
  $("p,div,li,tr,h1,h2,h3,h4,h5,section,article").each((_,el)=>$(el).append("\n"));
  return normalizeSpace($.root().text());
}
export function dice(a="", b=""){
  a=compact(a); b=compact(b);
  if(!a || !b) return 0;
  if(a===b) return 1;
  if(a.length<2 || b.length<2) return 0;
  const m=new Map();
  for(let i=0;i<a.length-1;i++){
    const g=a.slice(i,i+2); m.set(g,(m.get(g)||0)+1);
  }
  let hits=0;
  for(let i=0;i<b.length-1;i++){
    const g=b.slice(i,i+2), n=m.get(g)||0;
    if(n){hits++;m.set(g,n-1);}
  }
  return 2*hits/((a.length-1)+(b.length-1));
}
const DIG={"零":0,"〇":0,"一":1,"二":2,"兩":2,"三":3,"四":4,"五":5,"六":6,"七":7,"八":8,"九":9};
export function chineseNumber(s){
  s=String(s).trim();
  if(/^\d+$/.test(s)) return Number(s);
  let total=0, section=0, num=0;
  const unit={"十":10,"百":100,"千":1000};
  for(const ch of s){
    if(ch in DIG){num=DIG[ch];}
    else if(ch in unit){
      const u=unit[ch]; if(num===0) num=1; section += num*u; num=0;
    }
  }
  return total+section+num;
}
export function parseArticleNo(text=""){
  const m=String(text).match(/第\s*([0-9零〇一二兩三四五六七八九十百千]+)\s*條(?:\s*之\s*([0-9零〇一二兩三四五六七八九十百千]+))?/);
  if(!m) return null;
  const a=chineseNumber(m[1]), b=m[2]?chineseNumber(m[2]):null;
  return b?`${a}-${b}`:`${a}`;
}
export function expandRange(a,b){
  if(!a||!b) return [];
  const pa=String(a).split("-").map(Number), pb=String(b).split("-").map(Number);
  if(pa.length===1 && pb.length===1 && pb[0]>=pa[0] && pb[0]-pa[0]<=200){
    return Array.from({length:pb[0]-pa[0]+1},(_,i)=>String(pa[0]+i));
  }
  if(pa.length===2 && pb.length===2 && pa[0]===pb[0] && pb[1]>=pa[1] && pb[1]-pa[1]<=100){
    return Array.from({length:pb[1]-pa[1]+1},(_,i)=>`${pa[0]}-${pa[1]+i}`);
  }
  return [String(a),String(b)];
}
export function extractArticleNumbers(text=""){
  const out=[];
  const add=x=>{ if(x && !out.includes(x)) out.push(x); };
  const s=String(text).replace(/－|—/g,"-").replace(/至/g,"～");
  for(const m of s.matchAll(/第\s*([0-9\-、，,～~\s]+)\s*條/g)){
    const part=m[1].replace(/\s/g,"");
    for(const token of part.split(/[、，,]/)){
      const mm=token.match(/^([0-9]+(?:-[0-9]+)?)\s*[～~]\s*([0-9]+(?:-[0-9]+)?)$/);
      if(mm) expandRange(mm[1],mm[2]).forEach(add);
      else if(/^\d+(?:-\d+)?$/.test(token)) add(token);
    }
  }
  return out;
}
export function rocDateToIso(y,m,d){
  return `${Number(y)+1911}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
export function isoToRoc(iso){
  const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m?`${Number(m[1])-1911}/${m[2]}/${m[3]}`:iso;
}
export function sessionTermsForRoc(roc){
  if(roc===111) return ["1005","1006"];
  if(roc===112) return ["1007","1008"];
  if(roc===113) return ["1101","1102"];
  if(roc===114) return ["1103","1104"];
  if(roc===115) return ["1105","1106"];
  return [];
}
