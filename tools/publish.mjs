// Uses the same tracked-HEAD uploader as the other ~/games releases.
// The uploader refuses uncommitted changes and records publication.json.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,[fileURLToPath(new URL('../../tools/upload-game.mjs',import.meta.url)),root,...process.argv.slice(2)],{stdio:'inherit'});
