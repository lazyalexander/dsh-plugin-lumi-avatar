// Portable, bounded recording format: no images, audio, paths or provider commands.
export const CAPTURE_SCHEMA = 'lumi-upper-body-motion/1';
export const CAPTURE_BONES = new Set(['spine','chest','neck','head',...['left','right'].flatMap(side=>['Shoulder','UpperArm','LowerArm','Hand',...['ThumbMetacarpal','ThumbProximal','ThumbDistal','IndexProximal','IndexIntermediate','IndexDistal','MiddleProximal','MiddleIntermediate','MiddleDistal','RingProximal','RingIntermediate','RingDistal','LittleProximal','LittleIntermediate','LittleDistal']].map(n=>side+n))]);
export function validateRecording(input) {
  if(input?.schema!==CAPTURE_SCHEMA||!Array.isArray(input.frames)||input.frames.length<2||input.frames.length>7201)throw Error('录制文件格式不正确，或时长超过 2 分钟。');
  let previous=-1;
  const frames=input.frames.map(f=>{
    if(!Number.isFinite(f.t)||f.t<0||f.t>120.1||f.t<=previous)throw Error('动作时间必须连续递增。');previous=f.t;
    if(!f.bones||typeof f.bones!=='object'||Array.isArray(f.bones)||Object.keys(f.bones).length>CAPTURE_BONES.size)throw Error('动作骨骼数据无效。');
    const bones={};for(const [name,q]of Object.entries(f.bones)){
      if(!CAPTURE_BONES.has(name)||!Array.isArray(q)||q.length!==4||!q.every(Number.isFinite))throw Error('动作中包含不支持的骨骼。');
      const length=Math.hypot(...q);if(Math.abs(length-1)>.02)throw Error('动作旋转数据无效。');bones[name]=q.map(v=>v/length);
    }
    return {t:f.t,bones,tracked:Object.keys(bones).length>0};
  });
  if(frames[0].t>0.1||!frames.some(f=>f.tracked))throw Error('没有录到可用的人体动作。');
  return {schema:CAPTURE_SCHEMA,source:input.source==='camera'?'camera':'video',scope:'upper body and hands; feet remain supported',frames};
}
export function sampleRecording(clip,time) {
  const frames=clip.frames;if(time<0||time>frames.at(-1).t)return null;
  let lo=0,hi=frames.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(frames[m].t<=time)lo=m;else hi=m;}
  const a=frames[lo],b=frames[hi];
  // A long detection gap must not invent an arm sweep across the missing data.
  if(b.t-a.t>.4)return time-a.t<.12?{a:a.bones,b:a.bones,blend:0}:null;
  return{a:a.bones,b:b.bones,blend:Math.min(1,Math.max(0,(time-a.t)/(b.t-a.t)))};
}
