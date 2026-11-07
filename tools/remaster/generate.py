#!/usr/bin/env python3
"""Resumable FLUX references -> TRELLIS masters. Only one GPU job at a time.
FLUX uses an SSH tunnel to the documented .186 service; TRELLIS runs on .187.
"""
import argparse,base64,hashlib,json,os,subprocess,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
CAT=json.loads((ROOT/'tools/remaster/fish.json').read_text())
p=argparse.ArgumentParser();p.add_argument('--stage',choices=['images','models','all'],default='all');a=p.parse_args()
def request(base,path,body=None):
 req=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=1800) as r:return r.read()
def save_receipt(folder,service,body,reply,data):
 (folder/(service+'-receipt.json')).write_text(json.dumps({'service':service,'request':{k:v for k,v in body.items() if k!='image'},'response':reply,'sha256':hashlib.sha256(data).hexdigest(),'createdAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())},indent=2)+'\n')
tunnel=None
try:
 if a.stage!='models':
  tunnel=subprocess.Popen(['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','ExitOnForwardFailure=yes','-N','-L','127.0.0.1:27870:127.0.0.1:7870','albert@192.168.8.186'])
  time.sleep(2)
  if tunnel.poll() is not None:raise RuntimeError('FLUX tunnel failed')
 for f in CAT['fish']:
  folder=ROOT/'art/fish/sources'/f['id'];folder.mkdir(parents=True,exist_ok=True)
  image=folder/'reference.png';master=folder/'master.glb'
  if not image.exists() and a.stage!='models':
   body={'prompt':CAT['style']+' '+f['subject'],'width':1024,'height':1024,'num_inference_steps':28,'guidance_scale':4,'seed':f['seed'],'return_base64':False}
   print('GENERATING FLUX',f['id'],flush=True)
   base='http://127.0.0.1:27870';reply=json.loads(request(base,'/generate',body));data=request(base,reply['images'][0]['url']);image.write_bytes(data);save_receipt(folder,'flux',body,reply,data)
   print('SAVED',image.relative_to(ROOT),len(data),flush=True)
  if not master.exists() and a.stage!='images':
   body={'image':base64.b64encode(image.read_bytes()).decode(),'formats':['glb'],'seed':f['seed'],'ss_sampling_steps':20,'slat_sampling_steps':20,'simplify':.95,'texture_size':1024,'remove_background':True}
   print('GENERATING TRELLIS',f['id'],flush=True)
   base=os.environ.get('TRELLIS_URL','http://192.168.8.187:7871');reply=json.loads(request(base,'/generate',body));data=request(base,reply['files']['glb']['url']);master.write_bytes(data);save_receipt(folder,'trellis',body,reply,data)
   print('SAVED',master.relative_to(ROOT),len(data),flush=True)
finally:
 if tunnel:
  tunnel.terminate()
  try:tunnel.wait(timeout=5)
  except subprocess.TimeoutExpired:tunnel.kill()
