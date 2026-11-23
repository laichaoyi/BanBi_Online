'use strict';
process.env.RPS_REVEAL_MS='0';
const assert=require('node:assert/strict'),{server,rooms}=require('./server');
const Sport=require('./sport-modes');
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,a={},b={};
 async function request(client,action,extra={}){
   const res=await fetch(base+(action?'/api/action':'/api/state'),{method:action?'POST':'GET',headers:{'Content-Type':'application/json','X-Player-Token':client.token||''},...(action?{body:JSON.stringify({action,...extra})}:{})});
   const data=await res.json();if(data.token){client.token=data.token;client.me=data.me;}return {res,data};
 }
 async function api(client,action,extra){const {res,data}=await request(client,action,extra);assert.ok(res.ok,data.error);return data;}
 async function setup(mode){
   let state=await api(a,'create',{mode});await api(b,'join',{code:state.room.code});await api(a,'start');await api(a,'rps',{choice:1});state=await api(b,'rps',{choice:0});
   const r=rooms.get(state.room.code);assert.equal(r.game.turnDeadline-r.game.until,120000);return r;
 }
 const client=id=>id===a.me?a:b;
 function due(g){g.until=0;g.turnDeadline=Date.now()-1;}
 async function expire(r){const g=r.game,seq=g.turnSeq;due(g);await api(a);assert.equal(g.turnSeq,seq+1);if(g.phase!=='finished')assert.equal(g.turnDeadline-g.until,120000);assert.match(g.message,/hết 120 giây/);}
 try{
   let r=await setup('ring'),g=r.game,first=g.turn,original=structuredClone(g.marbles),seq=g.turnSeq;
   g.until=0;await api(client(first),'shot',{dir:-Math.PI/2,power:.7,angle:Math.PI/2,turnSeq:seq});assert.equal(g.turnDeadline-g.until,120000);assert.ok(g.shot===1);
   const full=await api(a);const query=new URLSearchParams({room:r.code,round:r.round,shot:g.last.n});const response=await fetch(base+'/api/state?'+query,{headers:{'X-Player-Token':a.token}});const compact=await response.json();assert.deepEqual(compact.room.game.last,{n:g.last.n});assert.ok(full.room.game.last.frames.length>1);assert.equal(JSON.stringify(compact).length<JSON.stringify(full).length,true);assert.equal(g.last.frames.length,full.room.game.last.frames.length,'poll must never mutate replay');
   // No timeout while rolling, even if deadline is stale.
   g.turnDeadline=Date.now()-1;g.until=Date.now()+1000;await api(a);assert.equal(g.turn,first);assert.equal(g.shot,1);
   const saved={marbles:structuredClone(g.marbles),cue:structuredClone(g.cue),cueHome:structuredClone(g.cueHome)},count=g.ringShots[first];
   await expire(r);const next=g.turn;assert.notEqual(next,first);assert.deepEqual(g.marbles,original);assert.deepEqual(structuredClone(g.ringPaused[first]),saved);assert.equal(g.ringShots[first],count);assert.equal(g.shot,1);
   const late=await request(client(first),'shot',{dir:0,power:.5,angle:0,turnSeq:seq});assert.equal(late.res.status,400);
   await expire(r);assert.equal(g.turn,first);assert.deepEqual(g.marbles,saved.marbles);assert.deepEqual(structuredClone(g.cue),saved.cue);assert.deepEqual(g.cueHome,saved.cueHome);assert.equal(g.ringShots[first],count);
   g.ringResults[next]={shots:4,complete:true,cleared:original.length};await expire(r);assert.equal(g.phase,'finished');assert.deepEqual(g.winner,[next]);assert.equal(g.turnDeadline,null);await api(a,'cancel');
   r=await setup('pool');g=r.game;const timerWho=g.turn;due(g);await new Promise(resolve=>setTimeout(resolve,380));assert.notEqual(g.turn,timerWho,'server timer works without a request');await api(a,'cancel');
   for(const mode of ['pool','carom','carom1','carom3','line','hole','petanque']){
     r=await setup(mode);g=r.game;const who=g.turn,balls=structuredClone(g.marbles),score=structuredClone(g.score),oldRemaining=g.remaining?.[who];
     await expire(r);assert.notEqual(g.turn,who,mode+' transfers play');assert.equal(g.shot,0);assert.deepEqual(g.score,score);
     if(mode==='petanque'){assert.equal(g.remaining[who],oldRemaining-1);assert.equal(Sport.activeBoules(g).owner,g.turn);assert.equal(g.marbles.filter(x=>x.style==='jack').length,1);}
     else assert.deepEqual(g.marbles,balls);
     if(mode==='line'||mode==='hole'){
       assert.ok(g.launched.includes(who));assert.ok(g.qualificationSkipped[who]);const current=g.turn;g.until=0;await api(client(current),'shot',{dir:-Math.PI/2,power:.8,angle:Math.PI/2,turnSeq:g.turnSeq});assert.equal(g.phase,mode==='line'?'attack':'hole');assert.equal(g.order[0],current);assert.equal(g.turn,current);
     }
     await api(a,'cancel');
   }
   console.log('PASS: 120 seconds after replay, automatic handoff in all eight modes, no phantom shot, ring attempt restoration, qualification skip, boule forfeit, stale request rejection.');
 }finally{server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
