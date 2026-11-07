import * as THREE from 'three';
import {CAPTURE_SCHEMA,validateRecording,sampleRecording} from './capture-recording.mjs';
import {retargetLandmarks,PoseSmoother} from './capture-retarget.js';

export class MotionCapture {
 constructor(api){
  this.api=api;this.video=document.querySelector('#captureVideo');this.note=document.querySelector('#captureStatus');
  this.worker=null;this.pending=new Map();this.sequence=0;this.generation=0;this.stream=null;this.live=null;this.clip=null;this.playing=null;this.recording=false;this.extracting=false;this.frames=[];this.smoother=new PoseSmoother();
  const bind=(id,fn)=>document.querySelector(id).onclick=()=>Promise.resolve().then(fn).catch(e=>this.fail(e));
  bind('#captureCamera',()=>this.camera());bind('#captureRecord',()=>this.record());bind('#captureStop',()=>this.stop());bind('#capturePlay',()=>this.play());bind('#captureSave',()=>this.save());
  document.querySelector('#captureFile').onchange=e=>this.selectVideo(e.target.files[0]).catch(x=>this.fail(x));
  document.querySelector('#captureLoad').onchange=e=>this.load(e.target.files[0]).catch(x=>this.fail(x));
  addEventListener('pagehide',()=>this.close());this.buttons();
 }
 status(text){this.note.textContent=text;}
 buttons(){
  document.querySelector('#captureRecord').disabled=(!this.stream&&!this.fileURL)||this.recording||this.extracting;
  document.querySelector('#capturePlay').disabled=!this.clip||this.recording||this.extracting;
  document.querySelector('#captureSave').disabled=!this.clip||this.recording||this.extracting;
  document.querySelector('#captureCamera').textContent=this.stream?'关闭摄像头':'打开摄像头';
  document.querySelector('#captureRecord').textContent=this.fileURL?'提取视频动作':'开始录制';
 }
 fail(error){this.status(error?.name==='NotAllowedError'?'摄像头未获允许。可在浏览器中允许，或选择本地视频。':String(error.message||error));this.recording=false;this.extracting=false;this.buttons();}
 async init(){
  if(this.initializing)return this.initializing;
  this.status('正在准备本机动作识别…');
  this.initializing=new Promise((resolve,reject)=>{
   const worker=this.worker=new Worker(new URL('./capture-worker.js',import.meta.url),{type:'module'});
   const initTimer=setTimeout(()=>reject(Error('动作识别器启动超时，请再试一次。')),45000);
   worker.onmessage=({data})=>{
    if(data.type==='ready'){clearTimeout(initTimer);resolve();return;}
    if(data.type==='error'&&data.id===undefined){clearTimeout(initTimer);reject(Error(data.error));return;}
    const job=this.pending.get(data.id);if(!job)return;this.pending.delete(data.id);clearTimeout(job.timer);
    if(data.type==='error')job.reject(Error(data.error));else job.resolve(data);
   };
   worker.onerror=e=>{clearTimeout(initTimer);reject(Error(e.message||'本机识别器无法启动。'));for(const job of this.pending.values()){clearTimeout(job.timer);job.reject(Error('识别器已停止。'));}this.pending.clear();};
   worker.postMessage({type:'init'});
  }).catch(e=>{this.worker?.terminate();this.worker=null;this.initializing=null;throw e;});
  return this.initializing;
 }
 async detect(time){
  const bitmap=await createImageBitmap(this.video),id=++this.sequence;
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('动作识别超时，请停止后重试。'));},20000);
   this.pending.set(id,{resolve,reject,timer});
   this.worker.postMessage({type:'frame',id,bitmap,time,timestamp:performance.now()},[bitmap]);
  });
 }
 consume(result,time,record=false){
  const bones=this.smoother.update(retargetLandmarks(result.pose,result.hand),time);
  const tracked=Object.keys(bones).length>0;
  this.live={bones,seen:performance.now()/1000};
  if(record&&(this.frames.length===0||time>this.frames.at(-1).t+1e-5))this.frames.push({t:time,bones,tracked});
  this.lastResult={tracked,hands:result.hand.landmarks.length,ms:result.ms,bones:Object.keys(bones).length};
  return this.lastResult;
 }
 async camera(){
  if(this.stream){this.stop();return;}
  this.stop();const generation=this.generation;await this.init();if(generation!==this.generation)return;
  // No permission request happens until this explicit user button is pressed.
  const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}},audio:false});
  if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
  this.stream=stream;this.video.srcObject=stream;this.video.classList.add('mirror');this.video.hidden=false;await this.video.play();this.buttons();
  this.status('摄像头已打开。让双肩、双手进入画面，准备好后点“开始录制”。');
  const loop=async()=>{
   if(generation!==this.generation||!this.stream)return;
   try{
    const time=this.video.currentTime;if(this.lastVideoTime!==time){this.lastVideoTime=time;
     const result=await this.detect(time);if(generation!==this.generation)return;
     if(this.recording&&this.recordStart===null)this.recordStart=time;
     const t=this.recording?time-this.recordStart:time;
     const s=this.consume(result,t,this.recording&&t<=120);
     this.status(`${this.recording?'录制中 '+t.toFixed(1)+' 秒':'实时预览'} · ${s.tracked?'双肩已识别':'请让双肩和躯干进入画面'} · 识别到 ${s.hands} 只手`);
     if(this.recording&&t>=120){this.finish('camera');this.recording=false;}
    }
   }catch(e){if(generation===this.generation){this.stop();this.fail(e);}return;}
   if(generation===this.generation)requestAnimationFrame(loop);
  };requestAnimationFrame(loop);
 }
 async selectVideo(file){
  if(!file)return;this.stop();if(!file.type.startsWith('video/'))throw Error('请选择浏览器能播放的视频文件。');
  this.fileURL=URL.createObjectURL(file);this.video.src=this.fileURL;this.video.classList.remove('mirror');this.video.hidden=false;
  await new Promise((resolve,reject)=>{this.video.onloadedmetadata=resolve;this.video.onerror=()=>reject(Error('浏览器无法读取这个视频。请使用 MP4 或 WebM。'));});
  if(!Number.isFinite(this.video.duration)||this.video.duration<.2){this.stop();throw Error('视频时长无效。');}
  this.status(`视频已选好，${this.video.duration.toFixed(1)} 秒。将提取前 ${Math.min(120,this.video.duration).toFixed(1)} 秒的动作。`);this.buttons();
 }
 async record(){
  this.playing=null;this.frames=[];this.smoother=new PoseSmoother();this.api.cancel();
  if(this.stream){this.recording=true;this.recordStart=null;this.buttons();return;}
  if(!this.fileURL)return;
  this.extracting=true;this.buttons();const generation=this.generation;
  try{
   await this.init();if(generation!==this.generation)return;
   const duration=Math.min(this.video.duration-.001,120);this.video.pause();
   for(let t=0;t<duration;t+=1/20){
    if(generation!==this.generation)return;
    await new Promise((resolve,reject)=>{if(Math.abs(this.video.currentTime-t)<1e-5&&this.video.readyState>=2){resolve();return;}const timer=setTimeout(()=>reject(Error('视频读取超时。')),5000);this.video.onseeked=()=>{clearTimeout(timer);resolve();};this.video.currentTime=t;});
    if(generation!==this.generation)return;
    const result=await this.detect(t);if(generation!==this.generation)return;
    const s=this.consume(result,t,true);this.status(`提取中 ${t.toFixed(1)} / ${duration.toFixed(1)} 秒 · ${s.tracked?'人体已识别':'这一帧未识别人形'} · ${s.hands} 只手`);
   }
   this.finish('video');
  }finally{if(generation===this.generation){this.extracting=false;this.live=null;this.buttons();}}
 }
 finish(source){
  if(this.frames.length<2){this.status('录制太短，请再试一次。');return;}
  this.clip=validateRecording({schema:CAPTURE_SCHEMA,source,frames:this.frames});
  const tracked=this.frames.filter(f=>f.tracked).length;
  this.status(`已录好 ${this.clip.frames.at(-1).t.toFixed(1)} 秒，${tracked}/${this.frames.length} 帧识别到人体。可以回放或保存动作。`);this.buttons();
 }
 stop(){
  if(this.recording){this.recording=false;try{this.finish('camera');}catch(e){this.fail(e);}}
  this.generation++;this.extracting=false;this.playing=null;this.live=null;this.lastVideoTime=null;
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;
  if(this.fileURL)URL.revokeObjectURL(this.fileURL);this.fileURL=null;this.video.removeAttribute('src');this.video.hidden=true;this.buttons();
  this.status(this.clip?'已停止。已录的动作仍可回放或保存。':'已停止。请选择视频或打开摄像头。');
 }
 play(){if(!this.clip)return;this.api.cancel();this.live=null;this.playing={start:this.api.snapshot().time};this.status('正在回放录制的动作。');}
 sample(time){
  let frame;
  if(this.playing){const elapsed=time-this.playing.start;frame=sampleRecording(this.clip,elapsed);if(elapsed>this.clip.frames.at(-1).t){this.playing=null;this.status('回放结束。');}}
  else if(this.live&&performance.now()/1000-this.live.seen<.25)frame={a:this.live.bones,b:this.live.bones,blend:0};
  if(!frame)return null;
  const out=new Map();for(const name of Object.keys(frame.a)){if(!frame.b[name])continue;out.set(name,new THREE.Quaternion().fromArray(frame.a[name]).slerp(new THREE.Quaternion().fromArray(frame.b[name]),frame.blend));}return out;
 }
 async load(file){
  if(!file)return;if(file.size>12*1024*1024)throw Error('动作文件超过 12 MB。');
  const clip=validateRecording(JSON.parse(await file.text()));this.stop();this.clip=clip;this.buttons();this.status(`已载入 ${clip.frames.at(-1).t.toFixed(1)} 秒的动作。`);
 }
 save(){if(!this.clip)return;const url=URL.createObjectURL(new Blob([JSON.stringify(this.clip)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='Lumi-motion.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 close(){this.stop();this.worker?.terminate();}
 snapshot(){return{cameraActive:!!this.stream,recording:this.recording,extracting:this.extracting,playing:!!this.playing,frames:this.clip?.frames.length||this.frames.length,last:this.lastResult,clip:this.clip};}
}
