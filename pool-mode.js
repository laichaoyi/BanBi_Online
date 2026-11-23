'use strict';
// Six-pocket marbles on a rectangular dirt board. Units are centimetres, velocities cm/s.
const W=42,H=83,R=1,DRAG=.28,FRICTION=68,MAX=275,DT=1/300;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function createPool(g){
 g.phase='pool';g.board={w:W,h:H};g.pockets=[];
 for(const x of [-W+1.8,W-1.8])for(const z of [-H+1.8,0,H-1.8])g.pockets.push({id:'pocket-'+g.pockets.length,x,z,r:2.25,depth:4.8});
 g.hole=g.pockets[0];g.teams=Object.fromEntries(g.order.map((p,i)=>[p,i%2?'black':'white']));g.playerKinds=Object.fromEntries(g.order.map(p=>[p,g.teams[p]==='white'?4:5]));g.teamScore={white:0,black:0};g.teamWinner=null;g.teamNext={white:1,black:0};
 g.cueHome={white:{x:-6,z:49},black:{x:6,z:49}};g.shooterMM=20;
 for(const team of ['white','black'])g.marbles.push({id:'cue-'+team,owner:null,team,kind:team==='white'?4:5,...g.cueHome[team],r:R});
 // The two unnumbered cue balls are permanent. Fourteen numbered solids/stripes (no separate 8-ball).
 let n=0;const numbers=[1,9,2,10,3,11,4,12,5,13,6,14,7,15],kinds=[1,2,0,6,1,3,0];
 for(let row=0;row<5;row++)for(let c=0;c<=row&&n<numbers.length;c++){const number=numbers[n++];g.marbles.push({id:'pool-'+number,owner:null,number,kind:kinds[(number-1)%8],x:(c-row/2)*2.12,z:-28-row*1.84,r:R});}
 g.total=14;g.blackLast=false;
 return g;
}
function simulatePool(g,dir,power,record=true){
 const cueId='cue-'+g.teams[g.turn],bodies=g.marbles.map(b=>({...b,vx:0,vz:0,drop:false})),cue=bodies.find(b=>b.id===cueId);cue.vx=Math.cos(dir)*(8+power*(MAX-8));cue.vz=Math.sin(dir)*(8+power*(MAX-8));
 const frames=[],hits=[],sunk=[],dropSet=new Set();let first=null;
 const snap=()=>{if(record)frames.push(bodies.map(b=>[+b.x.toFixed(3),+b.z.toFixed(3),b.drop?1:0]));};snap();
 function pocket(b,oldX,oldZ){for(const h of g.pockets){const dx=b.x-oldX,dz=b.z-oldZ,l=dx*dx+dz*dz,t=l?clamp(((h.x-oldX)*dx+(h.z-oldZ)*dz)/l,0,1):0;if(Math.hypot(oldX+t*dx-h.x,oldZ+t*dz-h.z)<=h.r-b.r*.55){b.drop=true;b.x=h.x;b.z=h.z;b.vx=b.vz=0;dropSet.add(b.id);sunk.push(b.id);return true;}}return false;}
 for(let step=0;step<2400;step++){
   let moving=false;for(const b of bodies){if(b.drop)continue;const speed=Math.hypot(b.vx,b.vz);if(speed<.65){b.vx=b.vz=0;continue;}moving=true;const s=Math.max(0,speed-(FRICTION+speed*DRAG)*DT)/speed;b.vx*=s;b.vz*=s;const ox=b.x,oz=b.z;b.x+=b.vx*DT;b.z+=b.vz*DT;if(pocket(b,ox,oz))continue;if(b.x<-W+b.r||b.x>W-b.r){b.x=clamp(b.x,-W+b.r,W-b.r);b.vx*=-.76;}if(b.z<-H+b.r||b.z>H-b.r){b.z=clamp(b.z,-H+b.r,H-b.r);b.vz*=-.76;}}
   for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){const a=bodies[i],b=bodies[j];if(a.drop||b.drop)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),sum=a.r+b.r;if(d<.00001||d>=sum)continue;const nx=dx/d,nz=dz/d,o=(sum-d)/2;a.x-=nx*o;a.z-=nz*o;b.x+=nx*o;b.z+=nz*o;const vn=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz;if(vn<=0)continue;const impulse=vn*.965;a.vx-=impulse*nx;a.vz-=impulse*nz;b.vx+=impulse*nx;b.vz+=impulse*nz;if(first===null&&(a===cue||b===cue))first=(a===cue?b:a).id;if(vn>1.5&&hits.length<200)hits.push({t:step*DT,v:vn,a:20,b:20,stone:false,x:a.x+nx*a.r,z:a.z+nz*a.r});}
   if(step%10===0)snap();if(!moving)break;
 }snap();if(sunk.length)for(let i=0;i<11;i++)snap();return {bodies,sunk,dropSet,first,frames,hits};
}
function settlePool(g,result){
 const who=g.turn,team=g.teams[who],other=team==='white'?'black':'white',removed=result.sunk.filter(id=>id.startsWith('pool-')),scratch=result.dropSet.has('cue-white'),blackDown=result.dropSet.has('cue-black');
 const remaining=g.marbles.filter(b=>b.number).length,earlyBlack=blackDown;
 const wrongFirst=remaining>0&&result.first?.startsWith('cue-'),foul=scratch||blackDown||wrongFirst;
 // Only numbered balls are permanently removed; both cue balls return after their drop animation.
 g.teamScore[team]+=removed.length;g.score[who]+=removed.length;
 g.marbles=result.bodies.filter(b=>!b.number||!result.dropSet.has(b.id)).map(({id,owner,team,number,kind,x,z,r})=>({id,owner,team,number,kind,x,z,r}));
 for(const b of g.marbles.filter(b=>b.team&&result.dropSet.has(b.id))){const home=g.cueHome[b.team];let pos={...home};for(let i=0;i<80&&g.marbles.some(c=>c.id!==b.id&&dist(c,pos)<2.2);i++)pos={x:clamp(home.x+(i%2?1:-1)*Math.ceil((i+1)/2)*2.5,-W+2,W-2),z:home.z+Math.floor(i/26)*5};Object.assign(b,pos);}
 g.blackLast=!g.marbles.some(b=>b.number);const winning=g.blackLast?(g.teamScore.white===g.teamScore.black?'draw':g.teamScore.white>g.teamScore.black?'white':'black'):null;
 if(winning){g.teamWinner=winning;g.winner=winning==='draw'?[]:g.order.filter(p=>g.teams[p]===winning);g.phase='finished';}
 else if(foul||!removed.length){const teamMembers=g.order.filter(p=>g.teams[p]===other);g.turn=teamMembers[g.teamNext[other]%teamMembers.length];g.teamNext[other]++;}
 return {removed,own:removed.length,scratch,earlyBlack,foul,wrongFirst,winning};
}
function botPlan(g){
 const team=g.teams[g.turn],a=g.marbles.find(b=>b.id==='cue-'+team),numbered=g.marbles.filter(b=>b.number),targets=numbered.length?numbered:g.marbles.filter(b=>b.id==='cue-black'),options=[];
 if(!numbered.length&&team==='black'){const h=g.pockets.slice().sort((p,q)=>dist(a,p)-dist(a,q))[0],d=dist(a,h),power=clamp((Math.sqrt(2*FRICTION*(d+4))*1.22-8)/(MAX-8),.06,1);return {dir:Math.atan2(h.z-a.z,h.x-a.x),power};}
 for(const b of targets)for(const h of g.pockets){const d=dist(b,h);if(d<.01)continue;const ux=(h.x-b.x)/d,uz=(h.z-b.z)/d,ghost={x:b.x-ux*2,z:b.z-uz*2};if(Math.abs(ghost.x)>W-1||Math.abs(ghost.z)>H-1)continue;const l=dist(a,ghost);if(l<.1)continue;const vx=(ghost.x-a.x)/l,vz=(ghost.z-a.z)/l,cut=vx*ux+vz*uz;if(cut<.24)continue;let blocked=false;for(const c of g.marbles){if(c.id===b.id||c.id===a.id)continue;const t=(c.x-a.x)*vx+(c.z-a.z)*vz,side=Math.abs((c.x-a.x)*vz-(c.z-a.z)*vx);if(t>0&&t<l&&side<2.03){blocked=true;break;}const t2=(c.x-b.x)*ux+(c.z-b.z)*uz,s2=Math.abs((c.x-b.x)*uz-(c.z-b.z)*ux);if(t2>0&&t2<d&&s2<2.04){blocked=true;break;}}if(blocked)continue;const speed=Math.sqrt(2*FRICTION*(l+(d+8)/(cut*cut)))*1.23;options.push({dir:Math.atan2(ghost.z-a.z,ghost.x-a.x),power:clamp((speed-8)/(MAX-8),.12,1),cost:l+d/cut+(speed>MAX?160:0)});}
 options.sort((a,b)=>a.cost-b.cost);if(options.length)return options[0];const b=targets.sort((b,c)=>dist(b,a)-dist(c,a))[0];return b?{dir:Math.atan2(b.z-a.z,b.x-a.x),power:.85}:{dir:0,power:.4};
}
module.exports={createPool,simulatePool,settlePool,botPlan,W,H,FRICTION,MAX,DRAG};
