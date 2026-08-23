#!/usr/bin/env python3
import json, re, os, sys, tempfile, subprocess, hashlib
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
CFG=json.loads((ROOT/"config/exam-sources.json").read_text(encoding="utf-8"))
OUT=ROOT/"data/exams/question-bank.json"
STATUS=ROOT/"data/exams/source-status.json"
DIAG=json.loads((ROOT/"data/exams/diagnostic-questions.json").read_text(encoding="utf-8"))
KEYS=json.loads((ROOT/"data/exams/official-answer-keys.json").read_text(encoding="utf-8"))

UA={"User-Agent":"LexCore-Exam-Sync/1.1 (+GitHub Actions)"}
SUBJECTS=["警察法規","刑法及刑事訴訟法","警察勤務","國文與憲法"]

def get(url, timeout=45):
    r=requests.get(url,headers=UA,timeout=timeout)
    r.raise_for_status()
    return r

def links(page):
    html=get(page).text
    soup=BeautifulSoup(html,"html.parser")
    out=[]
    for a in soup.find_all("a",href=True):
        txt=" ".join(a.get_text(" ",strip=True).split())
        href=urljoin(page,a["href"])
        if "downloadfile" in href or re.search(r"\.(pdf|zip|rar)(?:$|\?)",href,re.I):
            out.append({"text":txt,"url":href})
    return out

def choose_attachment(page, kind):
    rows=links(page)
    if kind=="questions":
        candidates=[x for x in rows if ("試題" in x["text"] and ("zip" in x["text"].lower() or "rar" in x["text"].lower() or "公告" in x["text"]))]
    else:
        candidates=[x for x in rows if "解答" in x["text"] and "pdf" in (x["text"]+x["url"]).lower()]
    return candidates[0] if candidates else None

def download(url,dest):
    r=get(url,90)
    dest.write_bytes(r.content)
    return dest

def extract_archive(path,outdir):
    outdir.mkdir(parents=True,exist_ok=True)
    # GitHub workflow installs p7zip-full; 7z supports zip/rar commonly used by CPU.
    p=subprocess.run(["7z","x","-y",f"-o{outdir}",str(path)],capture_output=True,text=True)
    if p.returncode!=0:
        raise RuntimeError(p.stderr[-1000:] or p.stdout[-1000:])
    return list(outdir.rglob("*.pdf"))

def pdf_text(path):
    parts=[]
    reader=PdfReader(str(path))
    for page in reader.pages:
        try: parts.append(page.extract_text() or "")
        except Exception: parts.append("")
    return "\n".join(parts)

def normalize(s):
    s=s.replace("\r","\n").replace("　"," ")
    s=re.sub(r"[ \t]+"," ",s)
    s=re.sub(r"\n{3,}","\n\n",s)
    return s.strip()

def subject_from_text(text):
    head=text[:5000]
    for s in SUBJECTS:
        if s in head:return s
    return None

def parse_options(block):
    found=list(re.finditer(r"\(([A-E])\)\s*",block))
    if not found:return {},block.strip()
    stem=block[:found[0].start()].strip()
    opts={}
    for i,m in enumerate(found):
        end=found[i+1].start() if i+1<len(found) else len(block)
        opts[m.group(1)]=re.sub(r"\s+"," ",block[m.end():end]).strip()
    return opts,stem

def parse_questions(text,year,source_url,filename):
    text=normalize(text)
    subject=subject_from_text(text)
    if not subject:return []
    # Remove header before first numbered question if possible.
    ms=list(re.finditer(r"(?m)(?<!\d)(\d{1,2})\.\s*",text))
    qs=[]
    for idx,m in enumerate(ms):
        no=int(m.group(1))
        if no<1 or no>40: continue
        end=ms[idx+1].start() if idx+1<len(ms) else len(text)
        block=text[m.end():end].strip()
        opts,stem=parse_options(block)
        expected=4 if no<=20 else 5
        if len(opts)<min(3,expected) or len(stem)<5: continue
        qtype="single" if no<=20 else "multiple"
        qs.append({
            "id":f"{year}-{subject}-{no}",
            "sourceType":"official",
            "year":year,"subject":subject,"number":no,"type":qtype,
            "stem":stem,"options":opts,
            "answer":None,"answerAccepted":None,
            "tags":[],"optionTags":{},
            "sourceUrl":source_url,"sourceFile":filename,
            "importConfidence": round(min(1.0,0.65+0.05*len(opts)),2)
        })
    # de-duplicate question numbers
    d={}
    for q in qs:
        if q["number"] not in d or len(q["stem"])>len(d[q["number"]]["stem"]): d[q["number"]]=q
    return [d[k] for k in sorted(d)]

def norm_answer(v):
    if isinstance(v,list): return [str(x).replace(" ","") for x in v]
    return [str(v).replace(" ","")]

def apply_answers(qs,year):
    y=KEYS.get(str(year),{})
    smap=y.get("subjects",{})
    for q in qs:
        v=smap.get(q["subject"],{}).get(str(q["number"]))
        if v is None: continue
        acc=norm_answer(v)
        q["answerAccepted"]=acc
        q["answer"]=list(acc[0]) if acc and re.fullmatch(r"[A-E]+",acc[0]) else []
        q["answerVersion"]=y.get("version")
        q["answerSource"]=y.get("source")
    return qs

def latest_answer_page(src):
    cors=src.get("corrections") or []
    return cors[-1]["url"] if cors else src["announcement"]

def main():
    status={"checkedAt":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),"years":[]}
    allq=[]
    with tempfile.TemporaryDirectory() as td:
        td=Path(td)
        for src in CFG["sources"]:
            year=src["rocYear"]; rec={"year":year,"ok":False,"files":[],"warnings":[]}
            try:
                qatt=choose_attachment(src["announcement"],"questions")
                aatt=choose_attachment(latest_answer_page(src),"answers")
                rec["questionAttachment"]=qatt
                rec["answerAttachment"]=aatt
                if not qatt: raise RuntimeError("找不到官方試題壓縮檔")
                suffix=".rar" if ".rar" in (qatt["text"]+qatt["url"]).lower() else ".zip"
                arc=download(qatt["url"],td/f"{year}-questions{suffix}")
                pdfs=extract_archive(arc,td/f"{year}-pdfs")
                for pdf in pdfs:
                    try:
                        txt=pdf_text(pdf)
                        sub=subject_from_text(txt)
                        if not sub: continue
                        qs=parse_questions(txt,year,qatt["url"],pdf.name)
                        allq.extend(apply_answers(qs,year))
                        rec["files"].append({"file":pdf.name,"subject":sub,"parsed":len(qs)})
                    except Exception as e:
                        rec["warnings"].append(f"{pdf.name}: {e}")
                rec["ok"]=True
            except Exception as e:
                rec["warnings"].append(str(e))
            status["years"].append(rec)
    # keep only stable official IDs
    dedup={}
    for q in allq:
        dedup[q["id"]]=q
    result={
        "generatedAt":status["checkedAt"],
        "officialImportStatus":"ok" if dedup else "no-official-question-text-parsed",
        "officialQuestions":[dedup[k] for k in sorted(dedup)],
        "diagnosticQuestions":DIAG["questions"],
        "officialAnswerKeys":KEYS,
        "sourceRegistry":CFG
    }
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    STATUS.write_text(json.dumps(status,ensure_ascii=False,indent=2),encoding="utf-8")
    print(f"official questions: {len(dedup)}")

if __name__=="__main__":
    main()
