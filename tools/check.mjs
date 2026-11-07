import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const exe=process.env.STARHERMIT || '/home/albert/sh/runtime/1.38.0/starhermit-1.38.0-linux-x86_64/starhermit';
const {files}=JSON.parse(readFileSync('starhermit-files.json','utf8'));
for(const [path,{sha256}] of Object.entries(files)){
 if(createHash('sha256').update(readFileSync(path)).digest('hex')!==sha256)throw new Error(`Repackage: ${path} changed`);
}
execFileSync(exe,['check','.','--quiet'],{stdio:'inherit',timeout:60000});
for(const [quality,script] of [['balanced','desktop'],['low','mobile'],['balanced','notebook'],['low','notebook-mobile'],['low','progression'],['high','remaster'],['ultra','graphics']]){
 execFileSync(exe,['.','--render-check','--guest','--quality',quality,'--script',`tests/native/${script}.play`],{stdio:'inherit',timeout:240000});
 console.log(`PASS ${quality}: ${script}`);
}
