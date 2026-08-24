export function splitReasonPoints(reason=""){
  const text=String(reason)
    .replace(/\u00a0/g," ")
    .replace(/[ \t]+/g," ")
    .replace(/\n+/g," ")
    .trim();
  if(!text)return [];
  const points=text.split(/(?<=[。！？；])\s*/).map(x=>x.trim()).filter(Boolean);
  return points.length?points:[text];
}
