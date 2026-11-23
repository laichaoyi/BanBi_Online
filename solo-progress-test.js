'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),logic=html.match(/<script id="aali-logic">([\s\S]*?)<\/script>/)[1];
const nodes=new Map(),node=id=>{
 if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',innerHTML:'',classList:{add(){},remove(){}},children:[],appendChild(x){this.children.push(x)},insertAdjacentHTML(){},setAttribute(k,v){this[k]=v}});
 return nodes.get(id);
};
const saved={current:1,unlocked:1,stars:{1:2,2:3}},events=[],calls=[];
const ctx={
 $:node,store:{get:(k,d)=>saved[k]??d,set:(k,v)=>{saved[k]=JSON.parse(JSON.stringify(v))}},
 clamp:(n,a,b)=>Math.max(a,Math.min(n,b)),NK:8,UI:{phase:'busy'},online3D:null,
 centreOverlays(){},pieces:new Map(),flyToPouch(){},pieceSeed:id=>id,
 ICON:{},KIND:Array.from({length:8},()=>({name:'bi'})),img:()=>({}),
 document:{createElement:()=>({})},window:{dispatchEvent:e=>events.push(e.type)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail}},
 level:{n:1,daily:null},levelLabel(){return 'Màn'},coarse:false,fullTip:()=>'',winSound(){},loseSound(){},showOverlay:(el,btn)=>{calls.push(btn);el.hidden=false},
 openMap(){calls.push('map')},startLevel:(n,daily)=>calls.push({n,daily})
};
vm.createContext(ctx);vm.runInContext(logic,ctx);ctx.A=ctx.window.AaliLogic||ctx.AaliLogic;
vm.runInContext(html.slice(html.indexOf('function loadProg()'),html.indexOf('function applyTheme()')),ctx);
assert.equal(ctx.PROG.current,3,'older saved ratings resume the next unfinished level');
assert.equal(ctx.PROG.unlocked,3);
assert.equal(ctx.PROG.stars[1],2);
ctx.PROG={current:1,unlocked:1,stars:{},pouch:Array(8).fill(0),recent:[],daily:{}};
vm.runInContext(html.slice(html.indexOf('function endLevel(won)'),html.indexOf('/* ---------- input:')),ctx);
vm.runInContext(html.slice(html.indexOf('function endPrimary()'),html.indexOf('function closeEnd()')),ctx);
for(let n=1;n<=6;n++){
 ctx.level={n,daily:null};ctx.UI.phase='busy';ctx.spec={shotLimit:4,stars:[0,2,1],goal:{type:'all',n:1}};
 ctx.st={shots:(n-1)%3+1,won:[{id:n,kind:0}],marbles:[]};
 const stars=ctx.A.starsFor(ctx.spec,ctx.st.shots,true);
 ctx.endLevel(true);
 assert.equal(ctx.PROG.stars[n],stars);
 assert.equal(saved.current,n+1);
 assert.equal(saved.unlocked,n+1);
 assert.equal(node('endStars')['aria-label'],stars+'/3 sao');
 assert.equal(node('endAdvance').textContent,'Đã mở khóa màn '+(n+1));
 assert.match(node('bNext').textContent,new RegExp('màn '+(n+1)));
 assert.equal(events.at(-1),'bi-solo-victory');
 ctx.endPrimary();assert.equal(calls.at(-1).n,n+1);
}
const prev=ctx.PROG.pouch[0];
ctx.level={n:1,daily:null};ctx.UI.phase='busy';ctx.st={shots:4,won:[{id:1,kind:0}],marbles:[]};
ctx.endLevel(true);
assert.equal(ctx.PROG.stars[1],3,'replay cannot erase a higher rating');
assert.equal(ctx.PROG.pouch[0],prev,'no duplicate reward on replay');
assert.equal(ctx.PROG.unlocked,7,'earlier replay never locks later stages');
ctx.level={n:7,daily:null};ctx.UI.phase='busy';ctx.st={shots:4,won:[],marbles:[]};ctx.endLevel(false);
assert.equal(node('endStars')['aria-label'],'0/3 sao');
assert.equal(ctx.PROG.stars[7],undefined);
assert.equal(node('endAdvance').hidden,true);
ctx.endPrimary();assert.equal(calls.at(-1).n,7,'failed level retries the same level');
console.log('PASS: recovery of saved progress, three star ratings, progression through level 7, replay records, and failure retry.');
