import * as THREE from 'three';
const V=(p)=>new THREE.Vector3(p.x,-p.y,-p.z), Q=()=>new THREE.Quaternion();
const clamp=THREE.MathUtils.clamp;
const axisZ=new THREE.Vector3(0,0,1);
function basis(x,y){x=x.clone().normalize();y=y.clone().addScaledVector(x,-y.dot(x)).normalize();if(y.lengthSq()<.1)return Q();const z=x.clone().cross(y).normalize();return Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
function limited(q,max){const a=Q().angleTo(q);return a>max?Q().slerp(q,max/a):q;}
/** MediaPipe world coordinates -> VRM normalized local rotations, stationary body. */
export function retargetLandmarks(pose,hands){
 const raw=pose?.worldLandmarks?.[0],image=pose?.landmarks?.[0];const bones={};
 if(!raw||!image)return bones;
 const finite=p=>p&&[p.x,p.y,p.z].every(Number.isFinite);
 const visible=(...ids)=>ids.every(i=>finite(raw[i])&&finite(image[i])&&Math.min(raw[i].visibility??1,image[i].visibility??1)>.55);
 if(!visible(11,12,23,24))return bones;
 const points=raw.map(V),shoulders=points[11].clone().add(points[12]).multiplyScalar(.5),hips=points[23].clone().add(points[24]).multiplyScalar(.5);
 const torso=limited(basis(points[11].clone().sub(points[12]),shoulders.clone().sub(hips)),.45);
 bones.spine=[0,0,0,1];bones.neck=[0,0,0,1];bones.chest=torso.toArray();
 if(visible(0,7,8)){
  const head=limited(basis(points[7].clone().sub(points[8]),new THREE.Vector3(0,1,0)),.5);
  bones.head=torso.clone().invert().multiply(head).toArray();
 }
 for(const[side,s,e,w,sign]of[['left',11,13,15,1],['right',12,14,16,-1]]){
  if(!visible(s,e,w))continue;
  bones[side+'Shoulder']=[0,0,0,1];
  const arm=points[e].clone().sub(points[s]).normalize(),fore=points[w].clone().sub(points[e]).normalize();
  const rest=new THREE.Vector3(sign,0,0),upper=Q().setFromUnitVectors(rest,arm),lower=Q().setFromUnitVectors(rest,fore);
  bones[side+'UpperArm']=torso.clone().invert().multiply(upper).toArray();
  bones[side+'LowerArm']=upper.clone().invert().multiply(lower).toArray();
  // Match detected hands by their wrist in the image. This avoids the selfie
  // handedness convention swapping an unmirrored video's left and right hands.
  let chosen=-1,distance=.16;
  for(let i=0;i<(hands?.landmarks?.length||0);i++){
   const wrist=hands.landmarks[i][0],d=Math.hypot(wrist.x-image[w].x,wrist.y-image[w].y);
   if(d<distance){distance=d;chosen=i;}
  }
  if(chosen<0||hands.worldLandmarks?.[chosen]?.length!==21||!hands.worldLandmarks[chosen].every(finite))continue;
  const hp=hands.worldLandmarks[chosen].map(V);
  const along=hp[9].clone().sub(hp[0]).normalize().multiplyScalar(sign);
  const across=hp[5].clone().sub(hp[17]).normalize();
  // In Lumi's rest hand, fingers point +/-X and the thumb lies on +Z.
  const palmY=across.clone().cross(along).normalize();
  const palm=basis(along,palmY);
  bones[side+'Hand']=lower.clone().invert().multiply(palm).toArray();
  for(const[finger,ids]of[['Index',[5,6,7,8]],['Middle',[9,10,11,12]],['Ring',[13,14,15,16]],['Little',[17,18,19,20]]]){
   const dirs=ids.slice(0,3).map((id,k)=>hp[ids[k+1]].clone().sub(hp[id]).normalize());
   const palmDir=hp[ids[0]].clone().sub(hp[0]).normalize();
   const curls=[clamp(palmDir.angleTo(dirs[0]),0,1.2),clamp(dirs[0].angleTo(dirs[1]),0,1.4),clamp(dirs[1].angleTo(dirs[2]),0,1.0)];
   ['Proximal','Intermediate','Distal'].forEach((segment,k)=>{bones[side+finger+segment]=Q().setFromAxisAngle(axisZ,-sign*curls[k]).toArray();});
  }
  // The opposed thumb has a distinct rest direction. Keep its metacarpal
  // relaxed and record flexion only; depth-derived thumb twist is unreliable.
  const a=hp[2].clone().sub(hp[1]),b=hp[3].clone().sub(hp[2]),c=hp[4].clone().sub(hp[3]);
  bones[side+'ThumbProximal']=Q().setFromAxisAngle(axisZ,-sign*clamp(a.angleTo(b),0,.8)).toArray();
  bones[side+'ThumbDistal']=Q().setFromAxisAngle(axisZ,-sign*clamp(b.angleTo(c),0,.8)).toArray();
 }
 return bones;
}
export class PoseSmoother{
 constructor(){this.previous=new Map();this.time=null;}
 update(bones,time){const dt=this.time===null?1/30:Math.max(0,time-this.time);this.time=time;const out={};
  for(const[name,value]of Object.entries(bones)){const q=Q().fromArray(value),old=this.previous.get(name);if(old&&time-old.time<.3)q.copy(old.q).slerp(Q().fromArray(value),1-Math.exp(-dt/.045));this.previous.set(name,{q:q.clone(),time});out[name]=q.toArray();}return out;
 }
}
