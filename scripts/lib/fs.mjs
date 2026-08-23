import fs from "node:fs/promises";
import path from "node:path";

export async function readJson(file, fallback=null){
  try { return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (e) { if (fallback !== null) return fallback; throw e; }
}
export async function writeJsonAtomic(file, data){
  await fs.mkdir(path.dirname(file), {recursive:true});
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmp, file);
}
export async function ensureDir(dir){ await fs.mkdir(dir, {recursive:true}); }
export async function exists(file){ try{ await fs.access(file); return true; } catch { return false; } }
