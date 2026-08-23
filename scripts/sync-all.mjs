import {spawn} from "node:child_process";
const args=new Set(process.argv.slice(2));
function run(file){
  return new Promise((resolve,reject)=>{
    const p=spawn(process.execPath,[file],{stdio:"inherit"});
    p.on("exit",c=>c===0?resolve():reject(new Error(`${file} exited ${c}`)));
  });
}
await run("scripts/sync-laws.mjs");
await run("scripts/sync-court.mjs");
if(args.has("--legislative") || (!args.has("--daily") && !args.has("--no-legislative"))){
  await run("scripts/sync-legislative.mjs");
}
await run("scripts/build-runtime.mjs");
await run("scripts/validate.mjs");
