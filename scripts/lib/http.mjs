const sleep = ms => new Promise(r=>setTimeout(r,ms));

export async function fetchText(url, opts={}){
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 30000;
  let last;
  for(let i=0;i<=retries;i++){
    const ctl = new AbortController();
    const t = setTimeout(()=>ctl.abort(), timeoutMs);
    try{
      const res = await fetch(url, {
        headers:{
          "user-agent":"LexCore-Law-Radar/0.7 (+GitHub Actions; official-data-sync)",
          "accept-language":"zh-TW,zh;q=0.9,en;q=0.6",
          ...(opts.headers||{})
        },
        signal:ctl.signal
      });
      clearTimeout(t);
      if(!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    }catch(e){
      clearTimeout(t);
      last=e;
      if(i<retries) await sleep((i+1)*1200);
    }
  }
  throw new Error(`fetch failed: ${url}: ${last}`);
}

export async function fetchJson(url, opts={}){
  const txt = await fetchText(url, {...opts, headers:{accept:"application/json", ...(opts.headers||{})}});
  try{return JSON.parse(txt);}
  catch(e){throw new Error(`invalid JSON from ${url}: ${e.message}; prefix=${txt.slice(0,160)}`);}
}

export async function politeDelay(ms=120){ await sleep(ms); }
