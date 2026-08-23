import {fetchJson, politeDelay} from "./http.mjs";

export function rowsFromPayload(payload){
  if(Array.isArray(payload)) return payload;
  if(!payload || typeof payload!=="object") return [];
  for(const k of ["data","result","records","items","jsonData"]){
    if(Array.isArray(payload[k])) return payload[k];
  }
  for(const v of Object.values(payload)){
    if(Array.isArray(v) && v.length && typeof v[0]==="object") return v;
  }
  return [];
}

export async function fetchPaged(datasetId, selectTerm="all", maxPages=60){
  const all=[];
  for(let page=1;page<=maxPages;page++){
    const url=`https://data.ly.gov.tw/odw/openDatasetJson.action?id=${datasetId}&selectTerm=${encodeURIComponent(selectTerm)}&page=${page}`;
    const payload=await fetchJson(url,{timeoutMs:60000,retries:3});
    const rows=rowsFromPayload(payload);
    if(!rows.length) break;
    all.push(...rows);
    if(rows.length<1000) break;
    await politeDelay(150);
  }
  return all;
}
