import {execFileSync} from 'node:child_process';
const exe=process.env.STARHERMIT || '/home/albert/sh/runtime/1.39.0/starhermit-1.39.0-linux-x86_64/starhermit';
execFileSync(exe,['package','--web','.'],{stdio:'inherit'});
