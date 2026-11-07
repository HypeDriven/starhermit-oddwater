#!/usr/bin/env python3
"""Normalize TRELLIS fish to +X forward, unit length; convert all textures to PNG.
Dependencies: Pillow, numpy, trimesh. Run optimize.mjs after this script.
"""
from pathlib import Path
import hashlib,io,json,struct,math
import numpy as np
from PIL import Image
import trimesh
ROOT=Path(__file__).resolve().parents[2]
CAT=json.loads((ROOT/'tools/remaster/fish.json').read_text())
def compact(data,side):
 size=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+size]);at=28+size
 binary=data[at:];out=bytearray()
 for n,view in enumerate(doc['bufferViews']):
  offset=view.get('byteOffset',0);chunk=binary[offset:offset+view['byteLength']]
  image=next((im for im in doc.get('images',[]) if im.get('bufferView')==n),None)
  if image is not None:
   im=Image.open(io.BytesIO(chunk)).convert('RGBA');im.thumbnail((side,side),Image.Resampling.LANCZOS)
   f=io.BytesIO();im.save(f,format='PNG',optimize=True);chunk=f.getvalue();image['mimeType']='image/png'
  out.extend(b'\0'*((-len(out))%4));view['byteOffset']=len(out);view['byteLength']=len(chunk);out.extend(chunk)
 out.extend(b'\0'*((-len(out))%4));doc['buffers'][0]['byteLength']=len(out)
 head=json.dumps(doc,separators=(',',':')).encode();head+=b' '*((-len(head))%4)
 return struct.pack('<III',0x46546c67,2,28+len(head)+len(out))+struct.pack('<II',len(head),0x4e4f534a)+head+struct.pack('<II',len(out),0x004e4942)+out
def vertex_normals(mesh):
 triangles=mesh.vertices[mesh.faces];face=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]);face/=np.maximum(np.linalg.norm(face,axis=1,keepdims=True),1e-20);normals=np.zeros_like(mesh.vertices)
 for corner in range(3):
  a=triangles[:,(corner+1)%3]-triangles[:,corner];b=triangles[:,(corner+2)%3]-triangles[:,corner]
  cosine=np.sum(a*b,axis=1)/np.maximum(np.linalg.norm(a,axis=1)*np.linalg.norm(b,axis=1),1e-20)
  np.add.at(normals,mesh.faces[:,corner],face*np.arccos(np.clip(cosine,-1,1))[:,None])
 normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-20);return normals
metadata={}
for fish in CAT['fish']:
 id=fish['id'];source=ROOT/'art/fish/sources'/id/'master.glb'
 scene=trimesh.load(source,force='scene',process=False)
 mesh=scene.to_geometry()
 lo,hi=mesh.bounds;extents=hi-lo
 if extents[2]>extents[0]:mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi/2,[0,1,0]))
 lo,hi=mesh.bounds;extents=hi-lo
 center=(lo+hi)/2;v=mesh.vertices-center
 left=v[(v[:,0]<-.28*extents[0])&(v[:,0]>-.45*extents[0])]
 right=v[(v[:,0]>.28*extents[0])&(v[:,0]<.45*extents[0])]
 # The head has a rounded cross-section; the caudal fin is a thin sheet.
 if np.std(left[:,2])>np.std(right[:,2]):mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi,[0,1,0]))
 lo,hi=mesh.bounds;extents=hi-lo
 print(id,'source bounds',lo.tolist(),hi.tolist(),flush=True)
 # Canonicalize the reconstructed model's actual forward axis, not the input image's orientation.
 mesh.apply_translation(-(lo+hi)/2);mesh.apply_scale(1/extents[0])
 mesh.vertex_normals=vertex_normals(mesh)
 mesh.visual.material.metallicFactor=.08;mesh.visual.material.roughnessFactor=.42
 metadata[id]={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceTriangles':len(mesh.faces),'bounds':mesh.bounds.tolist(),'lods':{}}
 for tier,res in [('low',256),('balanced',512),('high',768),('ultra',1024)]:
  folder=ROOT/'assets/fish'/tier;folder.mkdir(parents=True,exist_ok=True)
  data=compact(trimesh.exchange.gltf.export_glb(mesh,include_normals=True),res)
  (folder/(id+'.glb')).write_bytes(data)
(ROOT/'assets/fish/models.json').write_text(json.dumps(metadata,indent=2)+'\n')
