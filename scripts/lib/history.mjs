import {chineseNumber, extractArticleNumbers, rocDateToIso, isoToRoc, normalizeSpace} from "./text.mjs";

const CN = "0-9零〇一二兩三四五六七八九十百千";

/**
 * Parse numbered amendment-history items from the Laws & Regulations Database.
 *
 * Important:
 * Official history text commonly uses Chinese ROC numerals:
 *   "58. 中華民國一百十五年七月二十二日..."
 * not merely "民國 115 年 07 月 22 日".
 *
 * Anchoring on the numbered history item also prevents us from accidentally
 * treating an effective-date sentence inside the same item as a new amendment.
 */
export function parseOfficialHistoryText(text=""){
  const t=String(text).replace(/\r/g,"");
  const rx=new RegExp(
    `(?:^|\\n)\\s*(\\d+)\\.\\s*中華民國\\s*([${CN}\\s]+?)\\s*年\\s*([${CN}\\s]+?)\\s*月\\s*([${CN}\\s]+?)\\s*日([\\s\\S]*?)(?=\\n\\s*\\d+\\.\\s*中華民國|$)`,
    "g"
  );
  const events=[];
  for(const m of t.matchAll(rx)){
    const y=chineseNumber(m[2].replace(/\s/g,""));
    const mo=chineseNumber(m[3].replace(/\s/g,""));
    const d=chineseNumber(m[4].replace(/\s/g,""));
    if(!y || !mo || !d) continue;
    const iso=rocDateToIso(y,mo,d);
    const raw=normalizeSpace(m[5]).slice(0,2600);
    events.push({
      sequence:Number(m[1]),
      date:iso,
      rocDate:isoToRoc(iso),
      rocYear:y,
      raw,
      articles:extractArticleNumbers(raw)
    });
  }
  return events;
}
