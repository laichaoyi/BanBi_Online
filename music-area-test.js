'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync(__dirname+'/online.js','utf8');
const nodes=new Map(),events=new Map(),sounds=[];
const element=()=>({hidden:false,style:{},isConnected:false,append(n){n.isConnected=true;n.parentElement=this;},prepend(n){this.append(n);},after(n){n.isConnected=true;},remove(){this.isConnected=false;},setAttribute(){},classList:{add(){},remove(){}}});
function $(id){if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}
class Audio{
 constructor(src=''){this.src=src;this.paused=true;this.handlers={};sounds.push(this);}
 addEventListener(event,fn){this.handlers[event]=fn;}
 play(){this.paused=false;this.handlers.play?.();return Promise.resolve();}
 pause(){this.paused=true;this.handlers.pause?.();}
}
const stage=element(),shell=element(),ctx={Audio,$,el:element,button:element,musicOpen:element(),shell,active:false,data:null,screen:'',invite:null,document:{body:element(),hidden:false,querySelector:()=>stage,addEventListener:(name,fn)=>{if(!events.has(name))events.set(name,[]);events.get(name).push(fn);}},window:{addEventListener(){}},localStorage:{getItem:()=>null,setItem(){}},open(){throw Error('Unexpected invite');}};
vm.createContext(ctx);
vm.runInContext(js.slice(js.indexOf('// Arcalune\'s official'),js.lastIndexOf('})();')),ctx);
for(const fn of events.get('pointerdown'))fn();
assert.match(sounds[0].src,/dl\.arcalune\.com\/arc-48-childhood\.wav$/);assert.equal(sounds[0].paused,false);
assert.equal(vm.runInContext('music.parentElement',ctx),$('bi-game-music-slot'));
assert.equal(sounds[2].paused,false);assert.equal(sounds[3].paused,false);
ctx.active=true;ctx.screen='rps:A:1';ctx.data={room:{status:'rps'}};ctx.syncMusic();
assert.equal(vm.runInContext('music.parentElement===lobbyMusicSlot',ctx),true);
assert.equal(sounds[0].paused,true);assert.equal(sounds[1].paused,false);assert.equal(sounds[2].paused,true);assert.equal(sounds[3].paused,true);
assert.equal(sounds[1].src,'https://dl.arcalune.com/sunlit-capital.wav');
const markup=vm.runInContext('music.innerHTML',ctx);assert.equal((markup.match(/<button\b/g)||[]).length,1);assert.equal((markup.match(/<input\b/g)||[]).length,1);assert.ok(!/Arcalune|YouTube|bi-music-link|bi-music-seek|bi-music-next|bi-music-close/i.test(markup));
$('bi-volume').value='42';$('bi-volume').oninput();assert.equal(sounds[0].volume,.42);assert.equal(sounds[1].volume,.42);
$('bi-music-pause').onclick();assert.equal(sounds[1].paused,true);$('bi-music-pause').onclick();assert.equal(sounds[1].paused,false);
ctx.data.room={status:'playing',game:{shot:0},rpsResult:{},revealUntil:200,serverNow:100,mode:'ring'};ctx.syncMusic();
assert.equal(sounds[2].paused,true);assert.equal(vm.runInContext('musicArea',ctx),'rps');
ctx.data.room.serverNow=201;ctx.screen='match:A:1';shell.hidden=true;ctx.syncMusic();
assert.equal(vm.runInContext('music.parentElement',ctx),$('bi-game-music-slot'));
assert.equal(sounds[1].paused,true);assert.equal(sounds[0].paused,false);assert.equal(sounds[2].paused,false);
for(const mode of ['ring','line','hole','pool','carom','carom1','carom3','petanque']){
 ctx.data.room.mode=mode;ctx.syncMusic();assert.match(sounds[0].src,/^https:\/\/dl\.arcalune\.com\//);
}
console.log('PASS: channel-only area playlists, exact opening track of requested RPS video, no waves during choice/reveal, restore surf and change soundtrack on match.');
