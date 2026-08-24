function normalizeSpace(s=""){
  return String(s).replace(/\r/g,"").replace(/[ \t]+\n/g,"\n").replace(/\n[ \t]+/g,"\n").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
function normalizeArticleNo(raw=""){
  return String(raw).replace(/\s+/g,"").replace(/[－—–]/g,"-");
}
const ARTICLE_RE=/第\s*(\d+(?:\s*[-－—–]\s*\d+)?)\s*條/g;
const HEADING_RE=/(?:^|\n)\s*(第\s*[一二三四五六七八九十百千零〇兩0-9]+\s*(編|章|節)(?:\s*之\s*[一二三四五六七八九十百千零〇兩0-9]+)?)\s*([^\n]*)/g;
const HEADING_LEVEL={"編":1,"章":2,"節":3};

function collectLawAllMarks(text=""){
  const src=String(text).replace(/\r/g,"");
  const marks=[];let m;
  while((m=ARTICLE_RE.exec(src))) marks.push({article:normalizeArticleNo(m[1]),start:m.index,bodyStart:ARTICLE_RE.lastIndex});
  const headings=[];
  while((m=HEADING_RE.exec(src))){
    const type=m[2], code=String(m[1]).replace(/\s+/g,"");
    const title=normalizeSpace(m[3]);
    headings.push({start:m.index,type,level:HEADING_LEVEL[type],label:`${code}${title?` ${title}`:""}`});
  }
  return {src,marks,headings};
}
export function cleanupArticleBody(body=""){
  return normalizeSpace(body)
    .replace(/\n\s*:::[\s\S]*$/,"")
    .replace(/\n\s*最新訊息\s*\n\s*中央法規\s*\n\s*司法解釋[\s\S]*$/,"")
    .replace(/\n(?:附件|所有條文|編章節|條號查詢|條文檢索|授權子法|沿革|立法歷程|網站導覽|回上一頁)[\s\S]*$/,"")
    .trim();
}
function nextHeadingStart(headings,start,limit){
  const next=headings.find(h=>h.start>start&&h.start<limit);
  return next?next.start:limit;
}
export function parseAllArticlesFromText(text=""){
  const {src,marks,headings}=collectLawAllMarks(text);
  const out={};
  for(let i=0;i<marks.length;i++){
    const cur=marks[i],nextArticle=i+1<marks.length?marks[i+1].start:src.length;
    const end=nextHeadingStart(headings,cur.bodyStart,nextArticle);
    const body=cleanupArticleBody(src.slice(cur.bodyStart,end));
    if(body.length>=2 && !out[cur.article])out[cur.article]=body;
  }
  return out;
}

export function parseLawAllStructure(text=""){
  const {marks,headings}=collectLawAllMarks(text);
  const articles=parseAllArticlesFromText(text);
  const chapterRows=[];
  let headingIndex=0;
  const current=[];
  for(const mark of marks){
    while(headingIndex<headings.length&&headings[headingIndex].start<mark.start){
      const heading=headings[headingIndex++];
      current.splice(heading.level-1);
      current[heading.level-1]=heading;
      if(articles[mark.article]){
        chapterRows.push({
          id:`outline-${chapterRows.length+1}`,
          type:heading.type,
          label:heading.label,
          article:mark.article
        });
      }
    }
  }
  return {articles,chapters:chapterRows};
}
