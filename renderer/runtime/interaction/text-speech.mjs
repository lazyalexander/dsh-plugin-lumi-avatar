// Text-paced mouth motion, not phoneme or audio synchronization. Pauses and a
// bounded duration keep the face from cycling forever after a response.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shapes=[{aa:.38},{aa:.18,ih:.14},{aa:.18,ee:.13},{oh:.26,aa:.08},{ou:.23,aa:.08}];
const silence=()=>({active:false,weights:{aa:0,ih:0,ou:0,ee:0,oh:0},elapsed:0,duration:0});

export class TextSpeech {
  constructor(){this.cancel();}
  cancel(){this.segments=[];this.startTime=0;this.duration=0;}
  start(text,now,scene='explain'){
    this.cancel();this.startTime=now;
    const pace=scene==='anxious'?.86:scene==='serious'?1.08:1;
    const tokens=String(text).match(/[\p{Script=Han}]|[A-Za-z0-9]+|[，。！？、；：,.!?;:\n]|\S/gu)||[];
    let time=.12,index=0;
    for(const token of tokens){
      const pause=/^[^\p{L}\p{N}]+$/u.test(token);
      const seconds=pause?(/[。！？.!?\n]/.test(token)?.32:.18):clamp(.14+token.length*.035,.175,.48)*pace;
      if(time+seconds>24)break;
      const cycles=pause?0:Math.max(1,Math.round(seconds/.18));
      this.segments.push({start:time,end:time+seconds,cycles,shape:pause?{}:shapes[index++%shapes.length]});
      time+=seconds;
    }
    if(index)this.duration=time+.15;
  }
  sample(now){
    const elapsed=now-this.startTime;
    if(!this.duration||elapsed<0||elapsed>=this.duration)return silence();
    const result={...silence(),active:true,elapsed,duration:this.duration};
    const segment=this.segments.find(s=>elapsed>=s.start&&elapsed<s.end);
    if(segment?.cycles){
      const phase=(elapsed-segment.start)/(segment.end-segment.start)*segment.cycles;
      const pulse=Math.sin(Math.PI*(phase%1))**1.4;
      for(const [shape,weight] of Object.entries(segment.shape))result.weights[shape]=weight*pulse;
    }
    return result;
  }
}
