import * as audio from 'starhermit:audio';
import type {AudioClip,Sound} from 'starhermit:audio';
const clips=new Map<string,AudioClip>();
let enabled=false,prepared=false;const loops:Sound[]=[];
function startLoops(){if(!enabled||!prepared||loops.length)return;loops.push(audio.play(clips.get('aquarium')!,{loop:true,gain:.32,bus:'effects'}));loops.push(audio.play(clips.get('music')!,{loop:true,gain:.22,bus:'music'}));}
export async function prepareSound(){
 await Promise.all(['aquarium','feed','water','dream'].map(async id=>{clips.set(id,await audio.loadClip(`sfx/${id}.ogg`));}));
 // The optional soundtrack is decoded with the same mixer as the aquarium and effects.
 clips.set('music',await audio.loadClip('music/reverie.ogg'));prepared=true;startLoops();
}
export function soundEnabled(){return enabled;}
export function toggleSound(){
 enabled=!enabled;
 for(const loop of loops)loop.stop();loops.length=0;
 startLoops();
}
export function sound(id:string){if(enabled&&clips.has(id))audio.play(clips.get(id)!,{gain:id==='dream'?.34:.42,bus:'effects'});}
