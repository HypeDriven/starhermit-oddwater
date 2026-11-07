import * as draw from 'starhermit:draw';
import * as ui from 'starhermit:ui';
import {foods,species,guide,harmony,advice,projectInfo,milestoneList,nurseryNeeds} from './simulation.js';
import {habitats,neighbours,fieldNotes,broodNeeds} from './ecology.js';
import type {HabitatKind} from './ecology.js';
import type {Aquarium,FoodKind} from './simulation.js';
export const notebook={open:false,tab:0,page:0,care:0,nurseryType:0,habitat:0,bed:0};
export interface NotebookActions{act:(action:string,value?:string|number)=>void;find:(key:string)=>void;}
export function drawNotebook(s:Aquarium,w:number,h:number,scale:number,actions:NotebookActions){
 if(!notebook.open)return;
 const fit=Math.min(1,(h-20)/720);w/=fit;h/=fit;scale*=fit;
 const compact=w<850,bw=Math.min(w-20,790),x=(w-bw)/2,y=compact?90:Math.max(92,(h-620)/2),bh=Math.max(360,Math.min(h-y-18,650));
 const ink='#e5ece1',muted='#9bb1a4',lime='#d4eda2',gold='#efd69b';
 const box=(a:number,b:number,c:number,d:number,color:string,r=0)=>draw.roundRect(a*scale,b*scale,c*scale,d*scale,r*scale,color);
 const text=(value:string,a:number,b:number,size=12,color=ink)=>draw.text(value,a*scale,b*scale,{size:size*scale,color,font:'sans-serif'});
 const wrap=(value:string,a:number,b:number,width:number,size=12,color=muted)=>{
  const words=value.split(' ');let line='',row=0;const limit=Math.floor(width/(size*.55));
  for(const word of words){if((line+' '+word).length>limit&&line){text(line,a,b+row*(size+6),size,color);row++;line=word;}else line+=(line?' ':'')+word;}
  if(line)text(line,a,b+row*(size+6),size,color);return (row+1)*(size+6);
 };
 const button=(id:string,label:string,a:number,b:number,width:number,selected=false)=>{
  let clicked=false;ui.area({x:a*scale,y:b*scale,width:width*scale,height:52*scale},()=>{clicked=ui.id('notebook-'+id).style(id.startsWith('tab')?'notebook-tab':'small').button(label,{selected});});return clicked;
 };
 box(0,78,w,h-78,'#03110db0');box(x,y,bw,bh,'#102f2bfc',15);
 text('THE KEEPER’S NOTEBOOK',x+18,y+17,compact?16:23,lime);
 if(button('close','×',x+bw-52,y+10,36)){notebook.open=false;return;}
 const tabs=['Care','Goals','Guide','Log','Habitat'],tw=(bw-36)/5;
 for(let i=0;i<5;i++)if(button('tab'+i,tabs[i]!,x+18+i*tw,y+48,tw-5,notebook.tab===i)){notebook.tab=i;notebook.page=0;}
 const left=x+20,top=y+104,contentW=bw-40,bottom=y+bh-82;
 const pages=(total:number,perPage:number)=>{
  const max=Math.max(1,Math.ceil(total/perPage));notebook.page=Math.min(notebook.page,max-1);
  if(button('previous','←',left,bottom,48))notebook.page=(notebook.page+max-1)%max;
  text(`${notebook.page+1} / ${max}`,left+62,bottom+13,12,muted);
  if(button('next','→',x+bw-69,bottom,48))notebook.page=(notebook.page+1)%max;
 };
 if(notebook.tab===0){
  const labels=['Meals & water','Equipment','Plants & nursery'],partW=(bw-36)/3;
  for(let i=0;i<3;i++)if(button('care'+i,compact?['Meals','Equipment','Nursery'][i]!:labels[i]!,x+18+i*partW,top-4,partW-5,notebook.care===i))notebook.care=i;
  const cy=top+58;
  if(notebook.care===0){
   text('A meal for every neighbour',left,cy,18,lime);
   const kinds:FoodKind[]=['flakes','sinking','greens'];
   for(let i=0;i<3;i++)if(button('food'+i,compact?['Flakes','Pellets','Wafer'][i]!:foods[kinds[i]!].name,left+i*(contentW/3),cy+33,contentW/3-5,s.foodKind===kinds[i]))actions.act('food',kinds[i]);
   wrap(foods[s.foodKind].hint,left,cy+85,contentW);
   if(button('serve','Serve a small meal',left,cy+123,contentW/2-5))actions.act('feed');
   if(button('place','Place food',left+contentW/2+5,cy+123,contentW/2-5))actions.act('target-feed');
   text(`Grazers’ energy  ${Math.round(s.crewEnergy*100)}%`,left,cy+182,12,gold);
   wrap('A little algae and biofilm feed the clean-up crew. An occasional wafer helps; leftovers still become waste.',left,cy+207,contentW);
   wrap(advice(s),left,cy+276,contentW,12,lime);
  }else if(notebook.care===1){
   text('A tank that can grow with you',left,cy,18,lime);
   text(`Biological filter  ·  level ${s.filter+1}`,left,cy+36,14);
   text(`Sponge load ${Math.round(s.filterDirt*100)}% · flow ${Math.round((1-s.filterDirt*.58)*100)}%`,left,cy+61,12,muted);
   const fw=contentW/2-5;
   if(button('upgrade-filter',s.filter>=2?'Filter complete':`More media · ${[24,48][s.filter]} W`,left,cy+85,fw))actions.act('filter');
   if(button('rinse','Rinse sponge',left+fw+10,cy+85,fw))actions.act('rinse');
   text(`Air return  ·  level ${s.aerator+1}`,left,cy+148,14);
   if(button('upgrade-air',s.aerator>=2?'Air return complete':`Upgrade air · ${[18,36][s.aerator]} W`,left,cy+176,Math.min(contentW,220)))actions.act('aerator');
   text(`Light period  ·  ${s.lightHours} hours per tank day`,left,cy+238,13,gold);
   const values=[6,8,10,12];for(let i=0;i<4;i++)if(button('photoperiod'+i,values[i]+' h',left+i*contentW/4,cy+265,contentW/4-5,s.lightHours===values[i]))actions.act('light-hours',values[i]);
   wrap('Longer days grow plants and algae. Nights let the tank rest. Preview lighting does not change this cycle.',left,cy+317,contentW,11);
  }else{
   text('Stems, shelter and a new generation',left,cy,compact?15:18,lime);
   text(`Stem maturity ${Math.round(s.plantGrowth*100)}% · ${s.cuttings} cuttings saved`,left,cy+31,12,gold);
   if(button('trim','Trim stems',left,cy+57,contentW/2-5))actions.act('trim');
   if(button('plant',s.cuttings?'Plant a cutting':'Plant · 8 Wonder',left+contentW/2+5,cy+57,contentW/2-5))actions.act('plant');
   if(s.nursery){
    text(`${species[s.nursery.type]!.name} nursery`,left,cy+127,16,lime);
    text(`${s.nursery.hours.toFixed(1)} / 12 calm tank hours`,left,cy+155,12,gold);
    wrap(s.nursery.ready?'Two juveniles are ready to join their school.':'Progress pauses if harmony drops below 82%, oxygen below 6, or cover falls below 11 plants.',left,cy+182,contentW);
    if(button('welcome','Welcome juveniles',left,cy+251,Math.min(contentW,240)))actions.act('welcome-fry');
   }else{
    text('Prepare a sheltered nursery',left,cy+127,16,lime);
    if(button('nursery-species',species[notebook.nurseryType]!.name+'  →',left,cy+154,Math.min(contentW,260)))notebook.nurseryType=(notebook.nurseryType+1)%4;
    const need=nurseryNeeds(s,notebook.nurseryType);
    wrap(need||'Shelter and water quality are ready. Eggs need 12 calm tank hours.',left,cy+208,contentW,12,need?muted:lime);
    if(button('prepare','Prepare nursery · 18 W',left,cy+277,Math.min(contentW,250)))actions.act('nursery',notebook.nurseryType);
   }
  }
 }else if(notebook.tab===1){
  const project=projectInfo(s);
  text('KEEPER PROJECT '+(s.project.cycle+1),left,top,10,gold);
  text(project.title,left,top+22,compact?18:22,lime);
  wrap(project.detail,left,top+52,contentW);
  text(`${Math.min(project.target,project.progress).toFixed(project.target===4?1:0)} / ${project.target} · +${project.reward} Wonder`,left,top+95,12,gold);
  if(button('project',project.ready?'Collect project reward':'Project in progress',left,top+120,Math.min(contentW,240)))actions.act('project');
  const milestones=milestoneList(s);pages(milestones.length,2);
  for(let row=0;row<2;row++){
   const m=milestones[notebook.page*2+row];if(!m)break;const yy=top+185+row*99;
   text(m.title,left,yy,compact?13:16,lime);text(m.detail,left,yy+24,11,muted);
   const done=s.milestones.includes(m.id);
   text(done?'Remembered':`${Math.min(m.progress,m.target)} / ${m.target}`,left,yy+51,12,gold);
   if(!done&&m.progress>=m.target&&button('milestone-'+m.id,'Collect +'+m.reward,left+contentW-116,yy+40,116))actions.act('milestone',m.id);
  }
 }else if(notebook.tab===2){
  text(`FIELD GUIDE  ·  ${s.observed.length} / ${guide.length} observed`,left,top,12,gold);pages(guide.length,3);
  for(let row=0;row<3;row++){
   const g=guide[notebook.page*3+row];if(!g)break;const yy=top+35+row*112,seen=s.observed.includes(g.key);
   text((seen?'✓ ':'○ ')+g.name,left,yy,compact?15:18,lime);
   wrap(g.detail,left,yy+28,contentW-(compact?0:110),11);
   if(button('find-'+g.key,seen?'Visit':'Observe +3',left+contentW-110,yy+(compact?58:25),110))actions.find(g.key);
  }
 }else if(notebook.tab===3){
  text('What changed in your aquarium',left,top,18,lime);
  const log=[...s.log].reverse();pages(log.length,4);
  for(let row=0;row<4;row++){
   const entry=log[notebook.page*4+row];if(!entry)break;const yy=top+38+row*87;
   const hour=Math.floor(entry.hour%24);text(`DAY ${Math.floor(entry.hour/24)+1} · ${String(hour).padStart(2,'0')}:00`,left,yy,10,gold);
   wrap(entry.text,left,yy+20,contentW,11);
  }
 }else{
  const labels=['Layout','Colony','Field notes'];
  for(let i=0;i<3;i++)if(button('habitat-tab'+i,labels[i]!,left+i*contentW/3,top-4,contentW/3-5,notebook.habitat===i)){notebook.habitat=i;notebook.page=0;}
  const cy=top+57,e=s.ecology;
  if(notebook.habitat===0){
   text('Small places, different lives',left,cy,compact?16:20,lime);
   for(let i=0;i<3;i++)if(button('bed'+i,['Left bed','Middle bed','Right bed'][i]!,left+i*contentW/3,cy+33,contentW/3-5,notebook.bed===i))notebook.bed=i;
   const bed=e.habitats[notebook.bed]!,p=habitats[bed.kind];
   text(p.name+(bed.kind==='moss'?` · ${Math.round(bed.maturity*100)}% mature`:bed.kind==='leaves'?` · ${Math.round(bed.maturity*100)}% remaining`:''),left,cy+89,15,gold);
   wrap(p.detail,left,cy+116,contentW,12);
   const kinds:HabitatKind[]=['moss','leaves','cave','bare'];
   for(let i=0;i<4;i++){const kind=kinds[i]!,item=habitats[kind];if(button('habitat-'+kind,(compact?['Moss','Leaves','Refuge','Open gravel'][i]:item.name)+(item.cost?' · '+item.cost+' W':''),left+(i%2)*contentW/2,cy+186+Math.floor(i/2)*57,contentW/2-5))actions.act('habitat',notebook.bed+':'+kind);}
   wrap('Choose a bed, then place a habitat. Replacing costs its full price. Low leaf litter can be renewed; mature moss keeps growing.',left,cy+316,contentW,11);
  }else if(notebook.habitat===1){
   text('A living clean-up crew',left,cy,18,lime);
   const shrimp=e.colony.filter(n=>n.type<2).length;
   text(`${shrimp} / 13 shrimp · ${e.born} raised · ${e.moults} moults`,left,cy+30,12,gold);
   const need=broodNeeds(s,harmony(s));
   wrap(e.brood?`Cherry brood: ${e.brood.hours.toFixed(1)} / 16 settled hours. `+(e.brood.ready?'Shrimplets are ready.':need||'Safe in the moss.'):need||'Moss and water are ready for a cherry shrimp brood.',left,cy+55,contentW,11);
   if(button('brood',e.brood?.ready?'Welcome shrimplets':e.brood?'Brood developing':'Shelter brood · 12 W',left,cy+119,contentW/2-5))actions.act(e.brood?.ready?'welcome-shrimp':'brood');
   if(button('share','Share two adults',left+contentW/2+5,cy+119,contentW/2-5))actions.act('share-shrimp');
   pages(e.colony.length,2);
   for(let row=0;row<2;row++){const n=e.colony[notebook.page*2+row];if(!n)break;const yy=cy+185+row*80;
    text(neighbours[n.type]!.name+' #'+(n.id+1),left,yy,compact?13:16,lime);
    text((n.growth<.95?'Young · '+Math.round(n.growth*100)+'% grown':'Adult')+' · energy '+Math.round(n.energy*100)+'%',left,yy+25,11,muted);
    if(button('watch'+n.id,'Watch',left+contentW-85,yy+4,85))actions.find('resident-'+n.id);
   }
  }else{
   text(`Patient fieldwork · ${e.notes.length} / 4`,left,cy,18,lime);
   text('Watch a resident, then record its behavior. +5 Wonder each.',left,cy+31,compact?10:12,muted);
   for(let i=0;i<fieldNotes.length;i++){const f=fieldNotes[i]!,yy=cy+66+i*72; text((e.notes.includes(f.id)?'✓ ':'○ ')+f.title,left,yy,compact?13:16,lime);wrap(f.hint,left,yy+24,contentW,11);}
  }
 }
 text(`${Math.floor(s.wonder)} Wonder · ${Math.round(harmony(s))}% harmony`,left,y+bh-23,10,muted);
}
