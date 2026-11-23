'use strict';
const http=require('node:http'), fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
// Evaluate only the original standalone deterministic physics script in a clean context, never the browser renderer.
const originalLogic=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script id="aali-logic">([\s\S]*?)<\/script>/)[1],logicContext={};require('node:vm').runInNewContext(originalLogic,logicContext);const A=logicContext.AaliLogic;
const rooms=new Map(), sessions=new Map(), photos=new Map();
const Folk=require('./folk-avatars');
let lanIP;try{lanIP=Object.values(require('node:os').networkInterfaces()).flat().find(i=>i.family==='IPv4'&&!i.internal)?.address}catch{}
const Pool=require('./pool-mode');
const Sport=require('./sport-modes');
const Hole=require('./hole-physics');
const REVEAL_MS=process.env.RPS_REVEAL_MS===undefined?4600:Math.max(0,Math.min(10000,Number(process.env.RPS_REVEAL_MS)||0));
const TURN_MS=120000;
const MODES=['ring','line','hole','pool','carom','carom1','carom3','petanque'], MAX=8, names=Folk.presets;
const id=()=>crypto.randomBytes(18).toString('hex'), rand=()=>Math.random(), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fail=m=>{throw Error(m)}, clean=(s,n)=>String(s??'').trim().slice(0,n), time=()=>Date.now();
function dropPhoto(v){if(v?.startsWith('photo:'))photos.delete(v.slice(6))}
function jpegSize(b){if(b.length<20||b.readUInt16BE(0)!==0xffd8||b.readUInt16BE(b.length-2)!==0xffd9)return null;for(let i=2;i+4<b.length;){if(b[i++]!==255)return null;while(b[i]===255)i++;const m=b[i++];if(m===0xda||m===0xd9)return null;if(i+2>b.length)return null;const n=b.readUInt16BE(i);if(n<2||i+n>b.length)return null;if((m===0xc0||m===0xc2)&&n>=8)return [b.readUInt16BE(i+5),b.readUInt16BE(i+3)];i+=n}return null}
function changeAvatar(s,b){let v=b.avatar;if(b.photo!==undefined){if(typeof b.photo!=='string'||b.photo.length>44000||!/^[A-Za-z0-9+/]+={0,2}$/.test(b.photo))fail('Ảnh chân dung không hợp lệ.');const bytes=Buffer.from(b.photo,'base64'),wh=jpegSize(bytes);if(bytes.length>32768||!wh||wh.some(n=>n<1||n>256))fail('Ảnh phải là JPEG nhỏ hơn 256 × 256 và 32 KB.');const key=id();photos.set(key,bytes);v='photo:'+key;}else if(!Folk.valid(v))fail('Chân dung không hợp lệ.');dropPhoto(s.avatar);s.avatar=v;const r=rooms.get(s.room),p=r?.players.find(p=>p.id===s.id);if(p){p.avatar=v;bump(r)}}
function bump(r){r.rev++;r.touched=time()}
function armTurn(g){g.turnDeadline=g.phase==='finished'?null:g.until+TURN_MS;g.turnSeq=(g.turnSeq||0)+1;}
function nextInOrder(g,who,eligible){const i=g.order.indexOf(who);return g.order.slice(i+1).concat(g.order.slice(0,i)).find(eligible);}
function nextRingPlayer(g,who){return nextInOrder(g,who,id=>!g.ringResults[id]);}
function restoreRingAttempt(g,id){
 const saved=g.ringPaused[id];g.turn=id;
 g.marbles=saved?saved.marbles:g.ringStart.map(b=>({...b}));g.cue=saved?.cue||null;g.cueHome=saved?.cueHome||null;
 delete g.ringPaused[id];
}
function finishRing(r){
 const g=r.game,finished=g.order.filter(id=>g.ringResults[id]?.complete),best=Math.min(...finished.map(id=>g.ringResults[id].shots));
 g.winner=finished.filter(id=>g.ringResults[id].shots===best);g.phase='finished';
 g.message=g.winner.length?(g.winner.length>1?'Đồng hạng: ':'Thắng cuộc: ')+g.winner.map(id=>r.players.find(p=>p.id===id).name).join(', ')+' · '+best+' cú bắn.':'Hòa cuộc.';
}
function finishQualification(g,mode,bodies){
 const dist=id=>{if(g.qualificationSkipped?.[id])return Infinity;const b=bodies.find(x=>x.id===id);return mode==='line'?Math.abs(b.z+100):g.entered[id]?0:Math.hypot(b.x-g.hole.x,b.z-g.hole.z);};
 g.order.sort((a,b)=>dist(a)-dist(b));g.phase=mode==='line'?'attack':'hole';
 g.message+=mode==='line'?' Gần vạch nhất được bắn trước.':' Ưu tiên bi vào lỗ hoặc gần lỗ nhất.';
}
function chat(r,name,text){r.chat.push({name,text,t:time()});r.chat=r.chat.slice(-80);bump(r)}
function publicGame(r,known){
 const g=r.game;
 if(g?.last&&known?.get('room')===r.code&&known.get('round')===String(r.round)&&known.get('shot')===String(g.last.n)){
   return {...g,last:{n:g.last.n}};
 }
 return g;
}
function pub(r,s,known){return {code:r.code,name:r.name,mode:r.mode,host:r.host,players:r.players.map(p=>({...p,choice:r.status==='rps'&&p.id!==s.id?(p.choice===null?null:'ready'):p.choice})),status:r.status,chat:r.chat,game:publicGame(r,known),round:r.round||0,rev:r.rev,deadline:r.deadline||0,revealUntil:r.revealUntil||0,rpsResult:r.status==='rps'?null:r.rpsResult||null,serverNow:time()}}
function list(){return [...rooms.values()].filter(r=>r.status==='waiting').map(r=>({code:r.code,name:r.name,mode:r.mode,count:r.players.length,host:r.players[0]?.name}));}
function member(s){const r=rooms.get(s.room);if(!r||!r.players.some(p=>p.id===s.id))fail('Bạn không còn trong phòng.');return r}
function host(r,s){if(r.host!==s.id)fail('Chỉ chủ phòng được phép thao tác.');}
function remove(r,p,reason){r.players=r.players.filter(a=>a.id!==p.id);const s=sessions.get(p.id);if(s){s.room=null;s.notice=reason}chat(r,'Hệ thống',p.name+' '+reason);}
function cancel(r,reason){for(const p of r.players){const s=sessions.get(p.id);if(s){s.room=null;s.notice=reason}}rooms.delete(r.code)}
function leave(s){if(!s.room)return;const r=rooms.get(s.room);s.room=null;if(!r)return;const p=r.players.find(p=>p.id===s.id);if(!p)return;if(r.host===s.id&&r.status==='waiting'){cancel(r,'Chủ phòng đã hủy phòng.');return}if((r.status==='playing'&&r.game.phase!=='finished')||r.status==='rps'){p.bot=true;if(p.avatar?.startsWith('photo:'))p.avatar=Folk.random();if(!r.players.some(a=>!a.bot)){rooms.delete(r.code);return}if(r.host===s.id)r.host=r.players.find(a=>!a.bot).id;p.name=p.name+' (NPC)';p.choice=p.choice??Math.floor(rand()*3);chat(r,'Hệ thống',p.name+' tiếp quản lượt chơi.');if(r.status==='rps')resolveRps(r);return}remove(r,p,'đã rời phòng.');if(!r.players.some(p=>!p.bot))rooms.delete(r.code);else if(r.host===s.id){const next=r.players.find(p=>!p.bot);r.host=next.id;chat(r,'Hệ thống',next.name+' là chủ phòng mới.');}}
function join(s,r){if(s.room===r.code)return;if(r.kicked?.has(s.id))fail('Bạn đã bị chủ phòng mời ra.');if(r.status!=='waiting')fail('Phòng đã đóng cửa hoặc đang chơi.');if(r.players.length>=(r.mode==='petanque'?6:MAX))fail('Phòng đã đầy.');leave(s);s.room=r.code;s.notice='';r.players.push({id:s.id,name:s.name,avatar:s.avatar,bot:false});chat(r,'Hệ thống',s.name+' vào phòng.');}
function start(r){if(r.mode==='petanque'&&r.players.length>6)fail('Bi sắt tối đa 6 người.');if(r.players.length===1||r.mode==='petanque'&&r.players.length%2){const npc=names[Math.floor(rand()*names.length)];r.players.push({id:'npc-'+id(),name:npc.name+' · NPC',avatar:'folk:'+npc.id,bot:true});}r.round=(r.round||0)+1;r.game=null;r.rpsResult=null;r.revealUntil=0;r.status='rps';for(const p of r.players)p.choice=p.bot?Math.floor(rand()*3):null;r.deadline=time()+20000;chat(r,'Hệ thống','Ván '+r.round+' · Oẳn tù tì để xếp lượt!');}
function readyForNext(r){if(r.status!=='playing'||r.game.phase!=='finished'||r.game.until>time())fail('Hãy chờ ván hiện tại kết thúc.');}
function nextRoom(r,mode,play){readyForNext(r);if(!MODES.includes(mode))fail('Chế độ không hợp lệ.');if(mode==='petanque'&&r.players.length>6)fail('Bi sắt tối đa 6 người.');r.mode=mode;for(const p of r.players)p.choice=null;r.status='waiting';r.game=null;r.rpsResult=null;r.revealUntil=0;chat(r,'Hệ thống','Chủ phòng đã chọn chế độ cho ván tiếp theo.');if(play)start(r);}
function resolveRps(r){if(r.status!=='rps'||r.players.some(p=>p.choice===null))return;const scored=r.players.map(p=>({id:p.id,score:r.players.reduce((n,q)=>n+((p.choice-q.choice+3)%3===1?1:(p.choice-q.choice+3)%3===2?-1:0),0),tie:rand()})).sort((a,b)=>b.score-a.score||a.tie-b.tie);const order=scored.map(x=>x.id);if(r.mode==='line')order.reverse();const g={order,turn:order[0],phase:r.mode==='line'?'qualify':r.mode==='hole'?'hole-qualify':'ring',marbles:[],score:Object.fromEntries(order.map(i=>[i,0])),entered:{},launched:[],shot:0,until:0,last:null,winner:null,message:'Bắt đầu!',hole:{x:0,z:-52,r:1.25,depth:2.25}};
 g.playerKinds=Object.fromEntries(order.map((p,i)=>[p,[0,1,2,3,4,5,6,7][i]]));g.eliminated={};
 if(r.mode==='pool')Pool.createPool(g);else if(Sport.isCarom(r.mode))Sport.createCarom(g,r.mode);else if(r.mode==='petanque')Sport.createPetanque(g);else if(r.mode==='ring'){g.ringR=15+Math.max(0,order.length-2)*1.5;g.shooterMM=20;g.shooterR=g.ringR+A.PHYS.startGap+g.shooterMM/20;const n=order.length*2;for(let i=0;i<n;i++){const a=i*2.39996,rad=1.5+Math.sqrt(i)*1.85;g.marbles.push({id:'m'+i,owner:null,kind:i%3===0?6:i%3===1?1:0,x:Math.cos(a)*rad,z:Math.sin(a)*rad,r:.8});}}else{order.forEach((p,i)=>g.marbles.push({id:p,owner:p,kind:g.playerKinds[p],x:(i-(order.length-1)/2)*12,z:100,r:1.0}));}
 if(r.mode==='ring'){
   g.ringStart=g.marbles.map(b=>({...b}));
   g.ringShots=Object.fromEntries(order.map(id=>[id,0]));
   g.ringResults={};
   g.ringPaused={};
   g.message='Lần lượt dọn sạch vòng bi. Người ít cú bắn nhất thắng.';
 }
 if(r.mode==='hole')g.holeCourtR=Hole.COURT_RADIUS;
 if(r.mode==='hole'||Sport.isCarom(r.mode))g.wind=Hole.windFor(r.code,r.round,0);
 r.rpsResult={order:[...order],scores:Object.fromEntries(scored.map(p=>[p.id,p.score])),choices:Object.fromEntries(r.players.map(p=>[p.id,p.choice])),tied:scored.length>1&&scored[0].score===scored[1].score};r.revealUntil=time()+REVEAL_MS;g.until=r.revealUntil;g.botReadyAt=r.revealUntil+2300;
 armTurn(g);r.game=g;r.status='playing';chat(r,'Hệ thống','Thứ tự: '+order.map(i=>r.players.find(p=>p.id===i).name).join(' → '));bump(r);}
function origin(r,angle=0){const g=r.game;if(r.mode==='pool')return g.marbles.find(b=>b.id==='cue-'+g.teams[g.turn]);if(r.mode==='ring'){const p=g.cue||{x:g.shooterR*Math.cos(angle),z:g.shooterR*Math.sin(angle)};return {x:p.x,z:p.z,r:g.shooterMM/20,kind:-1,id:'shooter',owner:g.turn}}return g.marbles.find(b=>b.id===g.turn)}
function poolShot(r,dir,power){const g=r.game,who=g.turn,result=Pool.simulatePool(g,dir,power),out=Pool.settlePool(g,result),name=r.players.find(p=>p.id===who).name;g.shot++;g.last={n:g.shot,actor:who,ids:result.bodies.map(b=>b.id),bodies:result.bodies.map(({id,kind,r,owner,team,number})=>({id,kind,r,owner,team,number})),frames:result.frames,removed:out.removed,hits:result.hits,duration:result.frames.length/30};g.until=time()+Math.max(1000,g.last.duration*1000+450);g.botReadyAt=g.until+1900;g.message=out.winning?(out.winning==='draw'?'Hòa 7–7!':'Phe '+(out.winning==='white'?'trắng':'đen')+' thắng '+g.teamScore[out.winning]+' bi!'):name+(out.scratch||out.earlyBlack?' phạm lỗi: bi cái vào lỗ, đặt lại và chuyển lượt.':out.foul?' phạm lỗi: chạm bi cái đối phương trước, chuyển lượt.':out.own?' ăn '+out.own+' bi, tiếp tục lượt.':' hụt, chuyển phe.');armTurn(g);bump(r);}
function sportShot(r,dir,power){const g=r.game,actor=g.turn,carom=Sport.isCarom(r.mode),result=carom?Sport.simulateCarom(g,dir,power):Sport.simulatePetanque(g,dir,power);g.shot++;const last={n:g.shot,actor,active:carom?Sport.cueId(g,actor):result.active,ids:result.bodies.map(b=>b.id),bodies:result.bodies.map(Sport.bodyData),frames:result.frames,removed:[],hits:result.hits,duration:result.frames.length/30};if(carom){last.wind=g.wind;Sport.settleCarom(g,result);g.wind=Hole.windFor(r.code,r.round,g.shot);}else Sport.settlePetanque(g,result);g.last=last;g.until=time()+Math.max(1000,last.duration*1000+450);g.botReadyAt=g.until+1600;armTurn(g);bump(r);}
function ringShot(r,dir,power,angle){
 const g=r.game,who=g.turn,p=origin(r,angle),input=g.marbles.map(b=>({id:b.id,kind:b.kind,mm:b.r*20,x:b.x,z:b.z}));
 const res=A.simulate(g.ringR,input,{x:p.x,z:p.z,dx:Math.cos(dir),dz:Math.sin(dir),v:A.speedFor(power),mm:g.shooterMM},true), bodies=[p,...g.marbles],frames=[];
 if(!g.cueHome)g.cueHome={x:p.x,z:p.z};g.cue=A.cueAfter(g.ringR,res,g.cueHome);
 for(let i=0;i<res.frames.length;i+=2){const f=res.frames[i];frames.push(bodies.map((_,j)=>[f[j*2],f[j*2+1],0]));}const final=res.frames.at(-1);frames.push(bodies.map((_,j)=>[final[j*2],final[j*2+1],0]));
 const removed=new Set(res.won),player=r.players.find(p=>p.id===who);g.shot++;g.score[who]+=removed.size;g.marbles=bodies.slice(1).map((b,i)=>({...b,x:res.pos[(i+1)*2],z:res.pos[(i+1)*2+1]})).filter(b=>!removed.has(b.id));g.last={n:g.shot,actor:who,ids:bodies.map(b=>b.id),bodies:bodies.map(({id,kind,r,owner})=>({id,kind,r,owner})),frames,removed:[...removed],hits:res.hits,duration:frames.length/30};g.until=time()+Math.max(1000,g.last.duration*1000+450);
 g.ringShots[who]++;
 g.message=player.name+' · '+g.ringShots[who]+' cú, còn '+g.marbles.length+' bi.'+(g.cue.reset?' Bi cái ra ngoài, về điểm ban đầu.':' Bi cái giữ nguyên vị trí.');
 if(!g.marbles.length){
   g.ringResults[who]={shots:g.ringShots[who],complete:true,cleared:g.score[who]};
   const next=nextRingPlayer(g,who);
   if(next){
     restoreRingAttempt(g,next);
     g.message=player.name+' hoàn thành trong '+g.ringShots[who]+' cú. Đến phần thi của '+r.players.find(p=>p.id===next).name+'.';
   }else{
     finishRing(r);
   }
 }
 g.botReadyAt=g.until+1900;armTurn(g);bump(r);
}
function shot(r,dir,power,angle){if(Sport.isSport(r.mode))return sportShot(r,dir,power);if(r.mode==='ring')return ringShot(r,dir,power,angle);if(r.mode==='pool')return poolShot(r,dir,power);
 const g=r.game,who=g.turn,mode=r.mode,start=origin(r,angle);if(!start)fail('Không tìm thấy bi của người chơi.');const priorPhase=g.phase,holeQual=g.phase==='hole-qualify',qualifying=g.phase==='qualify'||holeQual,W=72,H=116,friction=145,max=345;
const bodies=g.marbles.map(b=>({...b,vx:0,vz:0,drop:false}));const a=bodies.find(b=>b.id===start.id);const speed=10+power*(max-10);a.vx=Math.cos(dir)*speed;a.vz=Math.sin(dir)*speed;
 const frames=[],hits=new Set(),hitEvents=[],sunk=new Set(), dt=1/180,wind=mode==='hole'?g.wind:null;let steps=0,overrun=false,nearest=Infinity;const snap=()=>frames.push(bodies.map(b=>[+b.x.toFixed(2),+b.z.toFixed(2),b.drop?1:0]));snap();
 for(;steps<1080;steps++){let busy=false;for(const b of bodies){if(b.drop)continue;let v=Math.hypot(b.vx,b.vz);if(v<.7){b.vx=b.vz=0;continue}busy=true;let old;if(mode==='hole'){old=Hole.roll(b,wind,dt);if(!old)continue;}else{let n=Math.max(0,v-(friction+v*.28)*dt);b.vx*=n/v;b.vz*=n/v;b.x+=b.vx*dt;b.z+=b.vz*dt;}
 if(mode==='hole'){
   const bank=Hole.rebound(b,g.holeCourtR);
   if(bank&&bank.v>2&&hitEvents.length<200)hitEvents.push({t:steps*dt,v:bank.v,a:b.r*20,b:b.r*20,stone:true,x:bank.x,z:bank.z});
 }else{
   if(b.x<-W||b.x>W){b.x=clamp(b.x,-W,W);b.vx*=-.48}
   if(b.z<-H||b.z>H){b.z=clamp(b.z,-H,H);b.vz*=-.48}
 }
 if(mode==='hole'){const test=Hole.rim(b,old,g.hole);if(b===a){nearest=Math.min(nearest,test.d);overrun||=test.overrun;}if(test.captured){b.drop=true;b.x=g.hole.x;b.z=g.hole.z;b.vx=b.vz=0;sunk.add(b.id);}}}
 for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++){let b=bodies[i],c=bodies[j];if(b.drop||c.drop)continue;let dx=c.x-b.x,dz=c.z-b.z,d=Math.hypot(dx,dz),sum=b.r+c.r;if(d>=sum||d<.0001)continue;let nx=dx/d,nz=dz/d,over=(sum-d)/2;b.x-=nx*over;b.z-=nz*over;c.x+=nx*over;c.z+=nz*over;let impulse=((b.vx-c.vx)*nx+(b.vz-c.vz)*nz)*.94;if(impulse>0){b.vx-=impulse*nx;b.vz-=impulse*nz;c.vx+=impulse*nx;c.vz+=impulse*nz;if(impulse>2&&hitEvents.length<200)hitEvents.push({t:steps*dt,v:impulse,a:b.r*20,b:c.r*20,stone:false,x:b.x+nx*b.r,z:b.z+nz*b.r});if(impulse>1&&g.phase!=='qualify'){if(b.id===a.id)hits.add(c.id);if(c.id===a.id)hits.add(b.id)}}}
 if(mode==='hole')for(const b of bodies)if(!b.drop)Hole.rebound(b,g.holeCourtR);
 if(steps%6===0)snap();if(!busy)break;}snap();if(sunk.size)for(let i=0;i<11;i++)snap();
 g.shot++;const removed=new Set();let keep=false;const whoName=r.players.find(p=>p.id===who).name;
 if(g.phase==='qualify'){g.launched.push(who);g.message=whoName+' cách vạch đích '+Math.abs(a.z+100).toFixed(1)+' cm.';if(g.launched.length===g.order.length)finishQualification(g,mode,bodies);}
 else if(holeQual){g.launched.push(who);g.message=whoName+' cách lỗ '+Math.hypot(a.x-g.hole.x,a.z-g.hole.z).toFixed(1)+' cm.';}
 else if(mode==='line'||g.entered[who]){for(const i of hits){if(i!==who){removed.add(i);g.score[who]++;}}keep=removed.size>0;g.message=whoName+(keep?' ăn '+removed.size+' viên bi đối thủ!':' bắn hụt.');}
 else g.message=whoName+' đang tìm đường vào lỗ.';
 if(mode==='hole'){for(const i of sunk){g.entered[i]=true;if(i===who){keep=!holeQual;g.message=whoName+' đã vào lỗ! Được quyền bắn ăn bi.'}const b=bodies.find(b=>b.id===i);const idx=g.order.indexOf(i),ang=idx*2.39996;b.x=g.hole.x+Math.cos(ang)*10;b.z=g.hole.z+Math.sin(ang)*10;}if(holeQual&&g.launched.length===g.order.length)finishQualification(g,mode,bodies);}
 for(const b of bodies)if(removed.has(b.id))g.eliminated[b.id]={x:b.x,z:b.z,kind:b.kind,by:who,shot:g.shot};
 g.last={n:g.shot,actor:who,ids:bodies.map(b=>b.id),bodies:bodies.map(({id,kind,r,owner})=>({id,kind,r,owner})),frames,removed:[...removed],hits:hitEvents,duration:frames.length/30};g.marbles=bodies.filter(b=>b.id!=='shooter'&&!removed.has(b.id)).map(({id,owner,kind,x,z,r})=>({id,owner,kind,x,z,r}));g.until=time()+Math.max(1000,g.last.duration*1000+450);
 if(g.phase!=='qualify'&&g.marbles.length===1)g.winner=[g.marbles[0].id];
 if(g.winner){g.phase='finished';g.message='Thắng cuộc: '+g.winner.map(i=>r.players.find(p=>p.id===i).name).join(', ');}
 else if(qualifying)g.turn=g.phase!==priorPhase?g.order[0]:g.order.find(id=>!g.launched.includes(id))||g.order[0];
 else if(!keep){let k=g.order.indexOf(who);do{k=(k+1)%g.order.length}while(!g.marbles.some(b=>b.id===g.order[k]));g.turn=g.order[k];}
 if(mode==='hole'){g.last.wind=wind;g.last.holeResult={entered:sunk.has(who),overrun,nearest:Number.isFinite(nearest)?+nearest.toFixed(2):null};if(overrun&&!sunk.has(who)&&g.phase!=='finished')g.message+=' Bi qua miệng lỗ quá nhanh — cần giảm lực!';else if(!sunk.has(who)&&nearest<3&&g.phase!=='finished')g.message+=' Sát miệng lỗ — chỉnh hướng/gió.';g.wind=Hole.windFor(r.code,r.round,g.shot);}
 g.botReadyAt=g.until+1900;armTurn(g);bump(r);
}
function ringBot(r){
 const g=r.game, marbles=g.marbles.map(b=>({...b,mm:b.r*20}));
 const spec={ringR:g.ringR,shooterMM:g.shooterMM,startTheta:Math.PI/2,arc:Math.PI,goal:{type:'count'}};
 const candidates=A.candidates(spec,{marbles,cue:g.cue},0);
 let best=null,bestScore=-Infinity;
 for(const candidate of candidates){
   if(candidate.power<.02)continue;
   const result=A.simulate(g.ringR,marbles,candidate,false);
   let score=result.won.length*100;
   for(let i=0;i<marbles.length;i++)if(!result.won.includes(marbles[i].id)){
     score+=Math.hypot(result.pos[(i+1)*2],result.pos[(i+1)*2+1])-Math.hypot(marbles[i].x,marbles[i].z);
   }
   score+=rand()*1.5;
   if(score>bestScore){bestScore=score;best=candidate;}
 }
 if(best)ringShot(r,Math.atan2(best.dz,best.dx),best.power,best.theta);
}
function bot(r){if(r.mode==='ring')return ringBot(r);if(Sport.isSport(r.mode)){const plan=Sport.isCarom(r.mode)?Sport.botCarom(r.game):Sport.botPetanque(r.game);return sportShot(r,plan.dir,plan.power)}if(r.mode==='pool'){const plan=Pool.botPlan(r.game);return poolShot(r,plan.dir,plan.power)}const g=r.game,ring=r.mode==='ring',a=ring?origin(r,Math.PI/2):origin(r);if(!a)return;let target;if(g.phase==='qualify')target={x:a.x,z:-100+rand()*10-5};else if(r.mode==='hole'&&!g.entered[g.turn])target=g.hole;else target=g.marbles.filter(b=>b.id!==a.id).sort((b,c)=>Math.hypot(b.x-a.x,b.z-a.z)-Math.hypot(c.x-a.x,c.z-a.z))[0];if(!target)return;if(r.mode==='hole'&&!g.entered[g.turn]){const plan=Hole.plan(a,g.hole,g.wind);let spread=Math.random()<.22?.016:.003;return shot(r,plan.dir+(rand()-.5)*spread,clamp(plan.power+(rand()-.5)*.009,.02,1),Math.PI/2);}let dir=Math.atan2(target.z-a.z,target.x-a.x)+(rand()-.5)*(r.mode==='hole'&&!g.entered[g.turn]?.005:.065),dist=Math.hypot(target.x-a.x,target.z-a.z),power=ring?clamp((dist+8)/38,.24,.95):clamp((Math.sqrt(2*145*(dist+(g.phase==='qualify'?0:12)))*1.19-10)/335,.06,1);shot(r,dir,power,Math.PI/2)}
function expireTurn(r,now=time()){
 const g=r.game;
 if(r.status!=='playing'||!g||g.phase==='finished'||g.until>now||!g.turnDeadline||g.turnDeadline>now)return false;
 const who=g.turn,player=r.players.find(p=>p.id===who),message=(player?.name||'Người chơi')+' đã hết 120 giây.';
 if(r.mode==='ring'){
   const next=nextRingPlayer(g,who);
   if(next){
     g.ringPaused[who]={marbles:g.marbles,cue:g.cue,cueHome:g.cueHome};
     restoreRingAttempt(g,next);
   }else{
     // Everyone else has completed their attempt. Close this last missed turn.
     g.ringResults[who]={shots:g.ringShots[who],complete:false,cleared:g.score[who]};
     finishRing(r);
   }
 }else if(r.mode==='petanque'){
   Sport.skipPetanque(g);
 }else if(r.mode==='pool'||Sport.isCarom(r.mode)){
   const other=Object.keys(g.teamScore).find(team=>team!==g.teams[who]);
   const members=g.order.filter(id=>g.teams[id]===other);
   g.turn=members[g.teamNext[other]%members.length];g.teamNext[other]++;
 }else if(g.phase==='qualify'||g.phase==='hole-qualify'){
   g.qualificationSkipped=g.qualificationSkipped||{};g.qualificationSkipped[who]=true;g.launched.push(who);
   if(g.launched.length===g.order.length){g.message='';finishQualification(g,r.mode,g.marbles);g.turn=g.order[0];}
   else g.turn=g.order.find(id=>!g.launched.includes(id));
 }else{
   g.turn=nextInOrder(g,who,id=>g.marbles.some(b=>b.owner===id))||who;
 }
 g.until=now;g.botReadyAt=now+1600;armTurn(g);
 const detail=g.phase==='finished'?g.message:(r.mode==='petanque'?' Mất một lượt ném.':'')+' Chuyển lượt: '+(r.players.find(p=>p.id===g.turn)?.name||'Người chơi')+'.';
 g.message=message+' '+detail;chat(r,'Hệ thống',g.message);return true;
}
setInterval(()=>{const now=time();for(const s of sessions.values())if(now-s.seen>90000){leave(s);dropPhoto(s.avatar);sessions.delete(s.id)}for(const r of rooms.values()){if(now-r.touched>3600000){cancel(r,'Phòng hết hạn.');continue}if(r.status==='rps'&&now>r.deadline){for(const p of r.players)if(p.choice===null)p.choice=Math.floor(rand()*3);resolveRps(r)}expireTurn(r,now);if(r.status==='playing'&&r.game.phase!=='finished'&&Math.max(r.game.until,r.game.botReadyAt||0)<now&&r.players.find(p=>p.id===r.game.turn)?.bot){try{bot(r)}catch(e){console.error(e)}}}},250).unref();
function action(s,b){if(b.action==='avatar'){changeAvatar(s,b);return}if(b.action==='name'){s.name=clean(b.name,24)||'Khách';return}if(b.action==='create'){leave(s);let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));const r={code,name:clean(b.name,45)||'Sân bi của '+s.name,mode:MODES.includes(b.mode)?b.mode:'ring',host:s.id,players:[],status:'waiting',kicked:new Set(),chat:[],rev:0,touched:time()};rooms.set(code,r);join(s,r);return}if(b.action==='join'){const r=rooms.get(clean(b.code,12).toUpperCase());if(!r)fail('Không tìm thấy phòng.');join(s,r);return}if(b.action==='leave'){leave(s);return}const r=member(s);switch(b.action){case 'chat':{const m=clean(b.text,300);if(!m)break;if(time()-(s.lastChat||0)<300)fail('Vui lòng gửi chậm hơn.');s.lastChat=time();chat(r,s.name,m);break}case 'rematch':host(r,s);nextRoom(r,b.mode||r.mode,true);break;case 'reopen':host(r,s);nextRoom(r,b.mode||r.mode,false);break;case 'request-rematch':readyForNext(r);if(r.players.find(p=>p.id===s.id).askedRound!==r.round){r.players.find(p=>p.id===s.id).askedRound=r.round;chat(r,'Hệ thống',s.name+' muốn chơi lại cùng phòng.')}break;case 'rename':{host(r,s);if(r.status!=='waiting')fail('Chỉ đổi tên ở phòng chờ.');const name=clean(b.name,45);if(!name)fail('Hãy nhập tên phòng.');if(name!==r.name){r.name=name;chat(r,'Hệ thống','Chủ phòng đổi tên thành: '+name);}break;}case 'mode':host(r,s);if(r.status!=='waiting'||!MODES.includes(b.mode))fail('Không thể đổi kiểu chơi.');if(b.mode==='petanque'&&r.players.length>6)fail('Bi sắt tối đa 6 người.');r.mode=b.mode;bump(r);break;case 'kick':host(r,s);if(r.status!=='waiting')fail('Trận đã bắt đầu.');const p=r.players.find(p=>p.id===b.player&&p.id!==s.id);if(!p)fail('Không tìm thấy người chơi.');r.kicked.add(p.id);remove(r,p,'đã bị chủ phòng mời ra.');break;case 'cancel':host(r,s);cancel(r,'Chủ phòng đã hủy phòng.');break;case 'start':host(r,s);if(r.status!=='waiting')fail('Trận đã bắt đầu.');start(r);break;case 'rps':if(r.status!=='rps'||!Number.isInteger(b.choice)||b.choice<0||b.choice>2)fail('Lượt oẳn tù tì không hợp lệ.');const me=r.players.find(p=>p.id===s.id);if(me.choice!==null)fail('Bạn đã chọn.');me.choice=b.choice;bump(r);resolveRps(r);break;case 'shot':if(expireTurn(r))fail('Bạn đã hết 120 giây.');if(r.status!=='playing'||r.game.phase==='finished'||r.game.turn!==s.id||r.game.until>time()||(b.turnSeq!==undefined&&b.turnSeq!==r.game.turnSeq))fail('Chưa đến lượt bắn.');if(![b.dir,b.power,b.angle].every(Number.isFinite)||b.power<.02||b.power>1)fail('Lực bắn không hợp lệ.');shot(r,b.dir,b.power,b.angle);break;default:fail('Thao tác không hợp lệ.')}}
function state(s,known){let room=rooms.get(s.room);if(room)expireTurn(room);return {token:s.token,me:s.id,name:s.name,avatar:s.avatar,rooms:list(),room:room?pub(room,s,known):null,notice:s.notice||'',lanIP}}
const files={'/pages-config.js':'pages-config.js','/':'index.html','/index.html':'index.html','/banbi.html':'index.html','/online.js':'online.js','/game-guide.js':'game-guide.js','/folk-avatars.js':'folk-avatars.js','/online.css':'online.css','/three.min.js':'three.min.js','/tide-plants.js':'tide-plants.js','/coastal-scene.js':'coastal-scene.js','/surf_far.ogg':'surf_far.ogg','/palms.ogg':'palms.ogg','/folk-serif-regular.woff':'folk-serif-regular.woff','/folk-serif-bold.woff':'folk-serif-bold.woff','/marbles.png':'marbles.png','/favicon.png':'marbles.png','/apple-touch-icon.png':'marbles.png','/manifest.json':'manifest.json','/flag-victory-cheer.mp3':'flag-victory-cheer.mp3','/folk-hand-0.jpg':'folk-hand-0.jpg','/folk-kids.jpg':'folk-kids.jpg','/folk-hand-2.jpg':'folk-hand-2.jpg','/folk-tree.jpg':'folk-tree.jpg','/folk-hand-1.jpg':'folk-hand-1.jpg','/folk-paper.jpg':'folk-paper.jpg','/folk-bamboo.jpg':'folk-bamboo.jpg','/folk-wave.jpg':'folk-wave.jpg','/folk-lotus.jpg':'folk-lotus.jpg','/folk-rps-kids.jpg':'folk-rps-kids.jpg','/folk-rps-background.jpg':'folk-rps-background.jpg','/folk-corner.jpg':'folk-corner.jpg','/folk-hero.jpg':'folk-hero.jpg','/village-print.svg':'village-print.svg','/folk-frame.svg':'folk-frame.svg','/music-garden.ogg':'music-garden.ogg','/music-afternoon.ogg':'music-afternoon.ogg','/music-night.ogg':'music-night.ogg'};const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.json':'application/json','.woff':'font/woff'};
function serveAudio(req,res,file){const local=path.join(__dirname,file),size=fs.statSync(local).size,head={'Content-Type':file.endsWith('.mp3')?'audio/mpeg':'audio/ogg','Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400'};let start=0,end=size-1;if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!m||(!m[1]&&!m[2])){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}if(start>=size||end<start||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();}head['Content-Range']='bytes '+start+'-'+end+'/'+size;}head['Content-Length']=end-start+1;res.writeHead(req.headers.range?206:200,head);if(req.method==='HEAD')return res.end();fs.createReadStream(local,{start,end}).pipe(res);}
const pagesOrigin=process.env.PAGES_ORIGIN||'https://laichaoyi.github.io';
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');const url=new URL(req.url,'http://localhost');
const crossOriginApi=url.pathname==='/api/state'||url.pathname==='/api/action'||url.pathname.startsWith('/avatar/');
if(crossOriginApi){
 res.setHeader('Vary','Origin');
 if(req.headers.origin===pagesOrigin){
   res.setHeader('Access-Control-Allow-Origin',pagesOrigin);
   res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Player-Token');
   res.setHeader('Access-Control-Max-Age','600');
 }
 if(req.method==='OPTIONS'){res.writeHead(req.headers.origin===pagesOrigin?204:403);return res.end();}
}
function json(o,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(o))}try{if(url.pathname==='/api/state'||url.pathname==='/api/action'){let s=[...sessions.values()].find(x=>x.token===req.headers['x-player-token']);if(!s){if(sessions.size>1500)fail('Máy chủ đang đầy.');s={id:id(),token:id(),name:'Khách '+Math.floor(rand()*9000+1000),avatar:'folk:'+crypto.randomBytes(4).toString('hex'),room:null,seen:time()};sessions.set(s.id,s)}s.seen=time();if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>50000)fail('Dữ liệu quá lớn.')}const body=JSON.parse(raw);if(body.action!=='avatar'&&raw.length>16000)fail('Dữ liệu quá lớn.');action(s,body)}const out=state(s,req.method==='GET'?url.searchParams:null);s.notice='';return json(out)}const photo=url.pathname.match(/^\/avatar\/([a-f0-9]{36})\.jpg$/);if(photo&&req.method==='GET'){const bytes=photos.get(photo[1]);if(!bytes){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=3600','Content-Length':bytes.length});return res.end(bytes)}const file=files[url.pathname];if((file?.endsWith('.ogg')||file?.endsWith('.mp3'))&&['GET','HEAD'].includes(req.method))return serveAudio(req,res,file);if(!file||req.method!=='GET'){res.writeHead(404);return res.end('Không tìm thấy trang')}res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-cache'});fs.createReadStream(path.join(__dirname,file)).pipe(res)}catch(e){json({error:e.message||'Lỗi máy chủ'},400)}});
function openGameBrowser(url){
 const {spawn}=require('node:child_process');
 const command=process.platform==='win32'?'cmd.exe':process.platform==='darwin'?'open':'xdg-open';
 const args=process.platform==='win32'?['/d','/c','start','',''+url]:[url];
 const child=spawn(command,args,{stdio:'ignore',windowsHide:true,detached:true});
 child.on('error',()=>console.log('Mở trình duyệt thủ công: '+url));
 child.unref();
}
function startServer(preferredPort=3000,{openBrowser=false,allowFallback=true}={}){
 const first=Number(preferredPort);
 if(!Number.isInteger(first)||first<1||first>65535){
   console.error('Cổng không hợp lệ. Dùng một số từ 1 đến 65535.');
   process.exitCode=1;return;
 }
 let port=first,attempts=0;
 function listen(){
   server.once('error',onError);
   server.once('listening',onReady);
   server.listen(port,'0.0.0.0');
 }
 function onError(err){
   server.removeListener('listening',onReady);
   if(err.code==='EADDRINUSE'&&allowFallback&&attempts<20&&port<65535){
     console.log('Cổng '+port+' đang được sử dụng. Đang thử cổng '+(port+1)+'...');port++;attempts++;listen();return;
   }
   console.error(err.code==='EADDRINUSE'?'Cổng '+port+' đang bận. Tắt cửa sổ máy chủ cũ hoặc chọn PORT khác.':'Không thể khởi động: '+err.message);
   process.exitCode=1;
 }
 function onReady(){
   server.removeListener('error',onError);
   const actual=server.address().port,url='http://localhost:'+actual;
   console.log('Bắn Bi online v4.1: '+url);
   if(lanIP)console.log('LAN: http://'+lanIP+':'+actual);
   if(actual!==first)console.log('Đã chọn cổng khác. Tiến độ chơi đơn lưu riêng theo địa chỉ; để dùng lại tiến độ ở cổng '+first+', hãy đóng máy chủ cũ rồi khởi động lại.');
   if(openBrowser)openGameBrowser(url);
 }
 listen();
}
if(require.main===module){
 const openBrowser=process.argv.includes('--open');
 startServer(process.env.PORT===undefined?3000:Number(process.env.PORT),{openBrowser,allowFallback:openBrowser||process.env.PORT===undefined||process.argv.includes('--fallback')});
}
module.exports={server,rooms}; // In-process integration tests; never exposed over HTTP.
