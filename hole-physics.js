'use strict';
// Centimetres, seconds. The wind is a public, fixed condition for the entire shot.
const DT=1/180,F=145,D=.28,MAX=345,STOP=.7,COURT_RADIUS=130;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function windFor(code,round,shot){let h=2166136261;for(const c of `${code}:${round}:${shot}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;const angle=(h%3600)*Math.PI/1800;const speed=+(0.7+((h>>>12)%43)/10).toFixed(1),force=speed*1.3;return {angle,speed,percent:Math.round(speed/5*100),x:Math.cos(angle)*force,z:Math.sin(angle)*force};}
function roll(b,wind,dt=DT){const v=Math.hypot(b.vx,b.vz);if(v<STOP){b.vx=b.vz=0;return null;}const old={x:b.x,z:b.z},s=Math.max(0,v-(F+D*v)*dt);if(s<STOP){b.vx=b.vz=0;return null;}b.vx=b.vx*s/v+(wind?.x||0)*dt;b.vz=b.vz*s/v+(wind?.z||0)*dt;b.x+=b.vx*dt;b.z+=b.vz*dt;return old;}
// The raised circular sand bank is the physical boundary. Preserve
// tangential motion and absorb energy in the normal direction.
function rebound(b,radius=COURT_RADIUS){
 const limit=radius-b.r,dist=Math.hypot(b.x,b.z);
 if(dist<=limit)return null;
 const nx=b.x/dist,nz=b.z/dist,v=b.vx*nx+b.vz*nz;
 b.x=nx*limit;b.z=nz*limit;
 if(v<=0)return null;
 b.vx-=1.48*v*nx;b.vz-=1.48*v*nz;
 return {x:nx*radius,z:nz*radius,v};
}
// A rolling ball needs sufficient time to fall. Fast or grazing shots pass over/along the lip.
function rim(b,old,h){const dx=b.x-old.x,dz=b.z-old.z,len=dx*dx+dz*dz,t=len?clamp(((h.x-old.x)*dx+(h.z-old.z)*dz)/len,0,1):0,d=Math.hypot(old.x+t*dx-h.x,old.z+t*dz-h.z),radius=Math.max(.1,h.r-b.r*.67),speed=Math.hypot(b.vx,b.vz);if(d>=radius)return {d,speed,captured:false,overrun:false};const limit=20+27*Math.sqrt(Math.max(0,1-(d/radius)**2));return {d,speed,limit,captured:speed<=limit,overrun:speed>limit};}
function trace(start,h,wind,dir,power,radius=COURT_RADIUS){const v=10+335*power,b={...start,vx:Math.cos(dir)*v,vz:Math.sin(dir)*v};let best=Infinity,atSpeed=Infinity,captured=false,overrun=false;for(let k=0;k<1080;k++){const old=roll(b,wind);if(!old)break;const test=rim(b,old,h);if(test.d<best){best=test.d;atSpeed=test.speed;}overrun||=test.overrun;if(test.captured){captured=true;break;}rebound(b,radius);}return {best,atSpeed,captured,overrun,x:b.x,z:b.z};}
// NPC uses a bounded search over direction and strength given the exact same wind, without a hidden snap.
function plan(start,h,wind){const angle=Math.atan2(h.z-start.z,h.x-start.x),goal=Math.hypot(h.x-start.x,h.z-start.z);let lo=.02,hi=1;for(let i=0;i<24;i++){const p=(lo+hi)/2,v=10+335*p,dist=v/D-F/(D*D)*Math.log((F+D*v)/F);if(dist<goal+3)lo=p;else hi=p;}let best={dir:angle,power:(lo+hi)/2,metric:Infinity};function tryOne(dir,power){power=clamp(power,.02,1);const r=trace(start,h,wind,dir,power),metric=r.captured?r.atSpeed*.002:r.best+Math.max(0,r.atSpeed-35)*.035+3;if(metric<best.metric)best={dir,power,metric,captured:r.captured};}
 const p0=best.power;for(let i=-12;i<=12;i++)for(let j=-4;j<=5;j++)tryOne(angle+i*.009,p0+j*.012);for(let k=0;k<3;k++){const {dir,power}=best,step=.003/2**k;for(let i=-4;i<=4;i++)for(let j=-3;j<=3;j++)tryOne(dir+i*step,power+j*step);}return best;}
module.exports={COURT_RADIUS,windFor,roll,rim,rebound,trace,plan};
