'use strict';
process.env.RPS_REVEAL_MS='0';
const assert=require('node:assert/strict');
const {server,rooms}=require('./server');
const fs=require('node:fs'),vm=require('node:vm');
const context={};
vm.runInNewContext(fs.readFileSync(__dirname+'/index.html','utf8').match(/<script id="aali-logic">([\s\S]*?)<\/script>/)[1],context);
const A=context.AaliLogic;
async function run(){
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const a={},b={};
 async function req(client,action,body={}){
   const res=await fetch(base+'/api/action',{method:'POST',headers:{'Content-Type':'application/json','X-Player-Token':client.token||''},body:JSON.stringify({action,...body})});
   const json=await res.json();assert.ok(res.ok,json.error);client.token=json.token;client.me=json.me;return json;
 }
 try{
   let state=await req(a,'create',{mode:'ring'});
   await req(b,'join',{code:state.room.code});await req(a,'start');
   await req(a,'rps',{choice:1});state=await req(b,'rps',{choice:0});
   const room=rooms.get(state.room.code),g=room.game,original=structuredClone(g.marbles);
   assert.deepEqual(g.order,[a.me,b.me]);assert.equal(g.turn,a.me);
   async function shoot(client,dir,power,angle=Math.PI/2){
     g.until=0;return req(client,'shot',{dir,power,angle});
   }
   await shoot(a,Math.PI/2,1);
   assert.equal(g.ringShots[a.me],1);assert.equal(g.turn,a.me);
   assert.equal(g.score[a.me],0);assert.equal(g.phase,'ring');
   // Finish both identical layouts with the same deterministic shot planner.
   async function complete(client){
     const start=g.ringShots[client.me];
     for(let i=0;i<50&&g.turn===client.me&&g.phase!=='finished';i++){
       const balls=g.marbles.map(b=>({...b,mm:b.r*20}));
       const spec={ringR:g.ringR,shooterMM:g.shooterMM,startTheta:Math.PI/2,arc:0,goal:{type:'count'}};
       let best=null,score=-Infinity;
       for(const candidate of A.candidates(spec,{marbles:balls,cue:g.cue},0)){
         const result=A.simulate(g.ringR,balls,candidate,false);
         let value=result.won.length*100;
         for(let j=0;j<balls.length;j++)if(!result.won.includes(balls[j].id))value+=Math.hypot(result.pos[(j+1)*2],result.pos[(j+1)*2+1])-Math.hypot(balls[j].x,balls[j].z);
         if(value>score){score=value;best=candidate;}
       }
       assert.ok(best);await shoot(client,Math.atan2(best.dz,best.dx),best.power,best.theta);
     }
     assert.ok(g.ringResults[client.me].complete);
     return g.ringResults[client.me].shots-start;
   }
   const shotsA=await complete(a);
   assert.equal(g.phase,'ring','first finisher cannot win yet');
   assert.equal(g.turn,b.me);assert.deepEqual(g.marbles,original);assert.equal(g.cue,null);
   assert.equal(g.ringShots[b.me],0);
   const shotsB=await complete(b);
   assert.equal(shotsA,shotsB);assert.equal(g.phase,'finished');
   assert.deepEqual(g.winner,[b.me]);assert.equal(g.ringResults[a.me].shots,g.ringResults[b.me].shots+1);
   console.log('PASS: RPS winner goes first, misses count, both clear identical layouts, fewer shots wins after all attempts.');
 }finally{server.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
