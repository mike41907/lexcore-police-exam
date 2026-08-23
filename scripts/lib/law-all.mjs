function normalizeSpace(s=""){
  return String(s).replace(/\r/g,"").replace(/[ \t]+\n/g,"\n").replace(/\n[ \t]+/g,"\n").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function normalizeArticleNo(raw=""){
  return String(raw).replace(/\s+/g,"").replace(/[－—–]/g,"-");
}
export function parseAllArticlesFromText(text=""){
  const src=String(text).replace(/\r/g,"");
  const re=/第\s*(\d+(?:\s*[-－—–]\s*\d+)?)\s*條/g;
  const marks=[];let m;
  while((m=re.exec(src))) marks.push({article:normalizeArticleNo(m[1]),start:m.index,bodyStart:re.lastIndex});
  const out={};
  for(let i=0;i<marks.length;i++){
    const cur=marks[i],end=i+1<marks.length?marks[i+1].start:src.length;
    let body=normalizeSpace(src.slice(cur.bodyStart,end));
    body=body.replace(/\n(?:附件|所有條文|編章節|條號查詢|條文檢索|授權子法|沿革|立法歷程|網站導覽|回上一頁)[\s\S]*$/,"").trim();
    if(body.length>=2 && !out[cur.article])out[cur.article]=body;
  }
  return out;
}
