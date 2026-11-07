// Real packaged browser startup and interaction regression: prevents audio-unlock black screens.
// Defaults to software rendering; GPU_ADAPTER=AMD uses the shared hardware-test lock.
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFileSync,existsSync,statSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome} from '../../tools/gpu-chrome.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),opt=(name,fallback)=>{const n=args.indexOf(name);return n<0?fallback:args[n+1];};
const shots=opt('--shots','/tmp/oddwater-browser');mkdirSync(shots,{recursive:true});
let chromium;
for(const dir of [root,resolve(root,'..'),...readdirSync(resolve(root,'..')).map(p=>resolve(root,'..',p))]){
 if(existsSync(join(dir,'node_modules/playwright-core'))){({chromium}=createRequire(join(dir,'package.json'))('playwright-core'));break;}
}
if(!chromium)throw new Error('Install playwright-core or use the existing sibling game dependencies');
const types={'.html':'text/html','.js':'text/javascript','.ts':'text/plain','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ogg':'audio/ogg'};
const server=createServer((req,res)=>{
 const path=normalize(decodeURIComponent(new URL(req.url,'http://localhost').pathname)).replace(/^\/+/, '')||'index.html';
 if(path==='api/v1/time'){res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({serverTime:Date.now()}));return;}
 if(path.split('/').some(p=>p.startsWith('.'))||['tools','tests','node_modules','art'].includes(path.split('/')[0])){res.writeHead(404).end();return;}
 const file=join(root,path);if(!existsSync(file)||!statSync(file).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'}).end(readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=opt('--url',`http://127.0.0.1:${server.address().port}/`);
const {browser,close,gpu}=await launchChrome(chromium,{adapter:process.env.GPU_ADAPTER||'software'});
let failed=false;const reports=[];
try{
 for(const [name,width,height,dpr] of [['desktop',1366,768,1],['phone',390,844,3]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,isMobile:name==='phone',hasTouch:name==='phone'});
  const page=await context.newPage(),problems=[];
  page.on('console',m=>{if(['error','warning'].includes(m.type())&&!/^No available adapters\.$|GL Driver Message/.test(m.text()))problems.push(m.text());});
  page.on('pageerror',e=>problems.push(e.message));page.on('requestfailed',r=>problems.push(`${r.url()}: ${r.failure()?.errorText}`));
  await page.goto(url,{waitUntil:'load',timeout:90000});
  await page.waitForFunction(()=>['running','error'].includes(document.documentElement.dataset.starhermit),null,{timeout:120000});
  // Asset and clip preparation is asynchronous; the game must become visible without any gesture.
  await page.waitForTimeout(8000);
  const initial=await page.screenshot({path:join(shots,`${name}-initial.png`),timeout:60000});
  if(initial.length<width*height*dpr*dpr*.015)problems.push('Blank aquarium before first input');
  if(name==='desktop'){
   await page.mouse.click(width-150,40); // Sound on: unlock and start background audio.
   await page.keyboard.press('f');await page.keyboard.press('w');
  }else{
   await page.touchscreen.tap(45,height-120);await page.touchscreen.tap(120,height-120);
   await page.touchscreen.tap(width-60,165); // Tank notes.
  }
  await page.waitForTimeout(2000);
  await page.screenshot({path:join(shots,`${name}-care.png`),timeout:60000});
  await page.mouse.click(width-37,40);await page.waitForTimeout(700);
  await page.screenshot({path:join(shots,`${name}-options.png`),timeout:60000});
  const state=await page.evaluate(()=>document.documentElement.dataset.starhermit);
  const ok=state==='running'&&problems.length===0;failed ||= !ok;
  const report={name,gpu,state,initialBytes:initial.length,ok,problems};reports.push(report);console.log(JSON.stringify(report));
  await context.close();
 }
}finally{await close();server.close();}
writeFileSync(join(shots,'report.json'),JSON.stringify(reports,null,2)+'\n');
process.exitCode=failed?1:0;
