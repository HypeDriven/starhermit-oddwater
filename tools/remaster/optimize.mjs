// Preserve texture seams while simplifying each fish for the four graphics tiers.
// Dependencies: npm install --prefix /tmp/going-up-gltf @gltf-transform/core @gltf-transform/functions meshoptimizer
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const deps=process.env.GLTF_TOOLS_ROOT||'/tmp/going-up-gltf/node_modules';
const {NodeIO}=await import(pathToFileURL(`${deps}/@gltf-transform/core/dist/index.js`));
const {weld,simplify}=await import(pathToFileURL(`${deps}/@gltf-transform/functions/dist/index.js`));
const {MeshoptSimplifier}=await import(pathToFileURL(`${deps}/meshoptimizer/index.js`));
await MeshoptSimplifier.ready;
const io=new NodeIO(),root=new URL('../../assets/fish/',import.meta.url);
const metadata=JSON.parse(await readFile(new URL('models.json',root),'utf8'));
for(const [id,meta] of Object.entries(metadata))for(const [tier,target,error] of [['low',1800,.025],['balanced',4000,.012],['high',8000,.005],['ultra',16000,.001]]){
 const path=new URL(`${tier}/${id}.glb`,root),doc=await io.read(path.pathname);
 const count=()=>doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3,0),0);
 const before=count();await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:Math.min(1,target/before),error,lockBorder:false}));
 const bytes=await io.writeBinary(doc);await writeFile(path,bytes);
 meta.lods[tier]={triangles:count(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
 console.log(tier,id,before,'->',count(),bytes.length);
}
await writeFile(new URL('models.json',root),JSON.stringify(metadata,null,2)+'\n');
