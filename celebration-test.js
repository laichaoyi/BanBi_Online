'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync(__dirname+'/online.js','utf8'),html=fs.readFileSync(__dirname+'/index.html','utf8');
new vm.Script(js);
const sounds=[],body={children:[],append(n){this.children.push(n)}};
function el(tag,cls,text){return {tag,cls,text,children:[],style:{setProperty(){}},append(...v){this.children.push(...v)},prepend(n){this.children.unshift(n)},remove(){this.removed=true},setAttribute(){},querySelector(cls){return this.children.find(n=>'.'+n.cls===cls)}}}
class Audio{constructor(src){this.src=src;sounds.push(this)}play(){this.played=true;return Promise.resolve()}pause(){this.paused=true}}
const calls=[],messages=[],handlers={};let soloRetry=0;
const ctx={el,button:(text,fn)=>({text,fn}),document:{body},window:{addEventListener(k,fn){handlers[k]=fn}},Audio,audio:{paused:false,volume:.4},matchMedia:()=>({matches:false}),setTimeout:()=>1,clearTimeout(){},Math,modeNames:{carom:'Carom'},data:null,act:async(action,extra)=>{calls.push({action,extra});return true},toast:t=>messages.push(t),$:id=>({click(){if(id==='bAgain')soloRetry++}})};
vm.createContext(ctx);vm.runInContext(js.slice(js.indexOf('let celebrationKey='),js.indexOf('// Arcalune\'s official')),ctx);
const room={code:'AAA',round:2,mode:'carom',host:'A',players:[{id:'A',name:'Bà Tám'},{id:'B',name:'Tí Sún'}],game:{phase:'finished',winner:['B'],teamWinner:'yellow',teamLabels:{yellow:'Vàng'},message:'Phe Vàng thắng 10 điểm!'}};
ctx.celebrateRoom(room);assert.equal(sounds.length,1);assert.equal(sounds[0].src,'./flag-victory-cheer.mp3');assert.equal(ctx.audio.volume,.1);
assert.equal(body.children.length,1);const layer=body.children[0];assert.equal(layer.children[0].children.length,100);assert.equal(layer.children[1].children.find(n=>n.tag==='h2').text,'Tí Sún');
ctx.celebrateRoom(room);assert.equal(sounds.length,1,'no duplicate cheer from polling');ctx.dismissVictory();assert.equal(ctx.audio.volume,.4);assert.ok(layer.removed);
room.round=3;room.game.teamWinner='draw';room.game.winner=[];ctx.celebrateRoom(room);assert.equal(sounds.length,1,'draw does not trigger victory music');assert.equal(body.children.at(-1).children[0].children.find(n=>n.tag==='h2').text,'Hòa cuộc!');
(async()=>{
 ctx.data={room,me:'A'};const drawBox=body.children.at(-1).children[0],retry=drawBox.children.find(n=>n.text==='Chơi lại');assert.ok(retry);await retry.fn();assert.equal(calls[0].action,'rematch');assert.equal(calls[0].extra.mode,'carom');assert.ok(body.children.at(-1).removed);
 room.round=4;ctx.data={room,me:'B'};ctx.celebrateRoom(room);await body.children.at(-1).children[0].children.find(n=>n.text==='Chơi lại').fn();assert.equal(calls[1].action,'request-rematch');assert.match(messages.at(-1),/chủ phòng/);
 handlers['bi-solo-victory']({detail:'Hoàn thành màn 1'});const solo=body.children.at(-1);assert.match(solo.cls,/bi-solo-celebration/);assert.equal(solo.children.find(n=>n.cls==='bi-victory-card'),undefined);assert.equal(soloRetry,0);assert.ok(solo.children.find(n=>n.cls==='bi-confetti'));handlers['bi-solo-celebration-end']();assert.ok(solo.removed);assert.equal(ctx.audio.volume,.4);
 assert.ok(html.includes("new CustomEvent('bi-solo-victory'"));console.log('PASS: authoritative winner banner, confetti, victory cheer, host rematch, guest request, solo effects without blocking ratings, and draw.');
})().catch(e=>{console.error(e);process.exitCode=1});
