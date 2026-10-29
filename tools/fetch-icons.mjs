// Raid Loadout icon fetcher. Read-only, no keys. Run on a machine that can reach the wiki:
//   node tools/fetch-icons.mjs <repo>/icons
// Finds each weapon/item's icon through the wiki's Cargo Items table, saves <slug>.png
// (weapons 128 px wide because they're 2:1, everything else 64 px) and writes CREDITS.md.
// The icons are (c) Fun Dog Studios, used with their permission (Oct 2026). They are not covered by the GPL.
import fs from "node:fs";import path from "node:path";
const API="https://theforeverwinter.wiki.gg/api.php";
const UA={"User-Agent":"winter-scav-tools raid-loadout icon fetch (fan tool; github.com/winter-scav-tools)"};
const out=process.argv[2];if(!out){console.error("usage: node fetch-icons.mjs <icons dir>");process.exit(1)}
const names=JSON.parse(fs.readFileSync(new URL("./icon-names.json",import.meta.url),"utf8"));
const slug=n=>n.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const get=async q=>{const r=await fetch(API+"?"+new URLSearchParams({...q,format:"json"}),{headers:UA});if(!r.ok)throw new Error(r.status+" "+q.action);return r.json()};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
fs.mkdirSync(out,{recursive:true});
const all=[...names.weapons.map(n=>[n,128]),...names.items.map(n=>[n,64])];
const img={};
for(let i=0;i<all.length;i+=40){const ch=all.slice(i,i+40).map(x=>x[0]);
  const j=await get({action:"cargoquery",tables:"Items",fields:"Name,Image",limit:"500",where:"Name IN ("+ch.map(n=>JSON.stringify(n)).join(",")+")"});
  for(const {title:t} of j.cargoquery)if(t.Image)img[t.Name]=t.Image;await wait(300)}
const found=[],missing=[];
for(const [n,w] of all){const f=img[n];if(!f){missing.push(n);continue}
  const j=await get({action:"query",prop:"imageinfo",iiprop:"url",iiurlwidth:String(w),titles:"File:"+f});
  const p=Object.values(j.query.pages)[0],u=p.imageinfo&&(p.imageinfo[0].thumburl||p.imageinfo[0].url);
  if(!u){missing.push(n);continue}
  const r=await fetch(u,{headers:UA});const buf=Buffer.from(await r.arrayBuffer());
  if(!r.ok||!/image\/png/.test(r.headers.get("content-type")||"")||buf.length<100){missing.push(n);continue}
  fs.writeFileSync(path.join(out,slug(n)+".png"),buf);found.push([n,buf.length]);await wait(200)}
fs.writeFileSync(path.join(out,"CREDITS.md"),`# Icons

These weapon and item icons are © Fun Dog Studios. They are used in Raid Loadout with Fun Dog Studios' permission
(given October 2026, for this free, non-commercial fan tool).

They are **not** covered by this repository's GPL-3.0 license. Don't reuse them in other projects, and never
in anything paid; ask Fun Dog Studios yourself.

Downloaded from The Forever Winter Wiki (weapons 128 px wide, other items 64 px). Goal-loot icons are loaded from the
Stash Ledger's own icons folder on the same site.
`);
const kb=found.reduce((a,x)=>a+x[1],0)/1024;
console.log(`found ${found.length}/${all.length} (${kb.toFixed(0)} KB)`);if(missing.length)console.log("missing: "+missing.join(", "));
