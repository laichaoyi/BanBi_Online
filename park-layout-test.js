'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawn}=require('node:child_process'),T=require('./three.min.js'),C=require('./coastal-scene'),P=require('./tide-plants');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8'),css=fs.readFileSync(path.join(__dirname,'online.css'),'utf8');
assert.ok(/#app\.win\{width:100%;max-width:none;/.test(css));assert.ok(html.includes('CoastalScene.build(scene,sp,SUN)'));assert.ok(!html.includes('beach-panorama.jpg'));assert.ok(!html.includes('park-panorama.jpg'));assert.ok(css.includes('.bi-lobby-wrap .bi-hero::after{inset:0'));assert.ok(css.includes("url('./folk-rps-background.jpg') center / 100% 100% no-repeat"));assert.ok(css.includes('.bi-rps-stage::before{content:none;display:none}'));
let paths=0,strokes=0;const ctx=new Proxy({save(){},restore(){},beginPath(){paths++},stroke(){strokes++},createLinearGradient(){return{addColorStop(){}}}},{get(o,k){return k in o?o[k]:()=>{}}});
global.document={createElement(){return{width:0,height:0,getContext:()=>ctx}}};
const scene=new T.Scene(),sun=new T.Vector3(-34,40,-41),spec={onlineMode:'petanque',board:{w:200,h:750},ringCm:260};
const original=P.buildPalmNear(11).geometry,near=C.palmModel(),far=C.palmModel(11,false);assert.ok(original.attributes.aMat);assert.ok(near.leaves.index.count>far.leaves.index.count);assert.ok(near.leaves.boundingSphere.radius>3);assert.ok(C.grassModel().attributes.position.count>30);
const layout=C.build(scene,spec,sun),group=scene.getObjectByName('Tidewater-3D-coast');assert.ok(group);assert.ok(group.children.filter(c=>c.isInstancedMesh).length>=8);assert.ok(group.children.filter(c=>c.isMesh&&!c.isInstancedMesh).length>=10);assert.ok(scene.background.isColor);assert.ok(scene.fog);assert.ok(C.terrainHeight(0,0,layout)<0);
const strokesBeforeShade=strokes,shade=C.shade(spec,sun);assert.equal(shade.size,2800);assert.equal(shade.texture.image.width,1024);assert.ok(paths>0);assert.equal(strokes,strokesBeforeShade,'no artificial lines added to palm geometry shadow');assert.ok(layout.near.filter(p=>p.near).length===5);assert.ok(html.includes('gLeaf = leafSample(vLf)')&&html.includes('edge*uLeafA.w'),'shadow texture edges fade to full light');
C.update(2500,{position:new T.Vector3(12,15,19)});const sea=group.children.find(c=>c.material.uniforms?.coast);assert.ok(sea);assert.equal(sea.material.uniforms.time.value,2.5);
const leaves=group.children.find(c=>c.isInstancedMesh&&c.geometry.userData.rest),before=leaves.geometry.attributes.position.array.slice(),version=shade.texture.version;
C.update(3000,{position:new T.Vector3(12,15,19)},{speed:4,angle:Math.PI/2});
assert.notDeepEqual(leaves.geometry.attributes.position.array,before,'palm frond geometry moves in wind');
assert.ok(shade.texture.version>version,'the existing projected shadow texture is redrawn');
const stopped=shade.texture.version;C.update(3500,{position:new T.Vector3()},null,true);assert.equal(shade.texture.version,stopped,'respect reduced motion');
C.update(3050,{position:new T.Vector3()});assert.equal(shade.texture.version,stopped,'skip redundant shadow uploads within budget');
const realCamera=new T.PerspectiveCamera(30,1.4,5,35000);realCamera.position.set(0,60,120);realCamera.lookAt(0,0,0);realCamera.updateMatrixWorld(true);C.syncView(4000,realCamera);
const plantMeshes=group.children.filter(m=>m.isInstancedMesh),triangles=m=>m.geometry.index.count/3*m.count;
const all=plantMeshes.reduce((n,m)=>n+triangles(m),0),shown=plantMeshes.filter(m=>m.visible).reduce((n,m)=>n+triangles(m),0);assert.ok(shown<all*.5,'skip off-camera vegetation');
assert.ok(plantMeshes.every(m=>m.userData.coastalBounds.isBox3));
// Regression: distant coastal geometry must never cap the seven excavated
// holes. Cast real rays into the rendered base terrain, not just the court.
const pool=require('./pool-mode').createPool({order:['a','b'],turn:'a',marbles:[],score:{a:0,b:0}});
for(const test of [{onlineMode:'pool',pockets:pool.pockets,board:pool.board,ringCm:260},{onlineMode:'hole',hole:{x:0,z:-52,r:1.25,depth:2.25},ringCm:260}]){
 const layout=C.build(scene,test,sun);assert.ok(layout.cut);scene.updateMatrixWorld(true);const land=scene.getObjectByName('coastal-terrain');assert.ok(land);
 for(const pit of test.pockets||[test.hole]){const ray=new T.Raycaster(new T.Vector3(pit.x,12,pit.z),new T.Vector3(0,-1,0));assert.equal(ray.intersectObject(land).length,0,'no coastal ground underneath '+(pit.id||'hole'));}
 const outside=new T.Raycaster(new T.Vector3(690,50,650),new T.Vector3(0,-1,0));assert.ok(outside.intersectObject(land).length>0,'coastal ground preserved outside court cut');
}
C.build(scene,{onlineMode:'ring',ringCm:50},sun);assert.notEqual(scene.getObjectByName('Tidewater-3D-coast'),group);assert.equal(scene.children.filter(x=>x.name==='Tidewater-3D-coast').length,1);
const v={clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),Math};vm.createContext(v);vm.runInContext(html.slice(html.indexOf('function ballShadowProjection('),html.indexOf('function updateDecals()')),v);const low=v.ballShadowProjection(20,-100,5.2,5.2,.6,.8,1.33),high=v.ballShadowProjection(20,-100,170,5.2,.6,.8,1.33);assert.ok(high.x>low.x+100);assert.ok(high.z>low.z+160);assert.ok(high.wide>low.wide);assert.equal(low.contact,1);assert.equal(high.contact,0);assert.ok(html.includes('flying.has(p)?clamp(1-lift/3,0,1):1'));
const cp=spawn(process.execPath,[path.join(__dirname,'server.js')],{env:{...process.env,PORT:'31994'},stdio:['ignore','pipe','inherit']});
(async()=>{try{await new Promise((resolve,reject)=>{cp.stdout.once('data',resolve);cp.once('exit',reject)});for(const name of ['tide-plants.js','coastal-scene.js','surf_far.ogg','palms.ogg','folk-serif-regular.woff','folk-serif-bold.woff','folk-hero.jpg','folk-frame.svg','folk-rps-background.jpg']){const res=await fetch('http://127.0.0.1:31994/'+name);assert.equal(res.status,200,name);if(name.endsWith('.ogg')){assert.equal(res.headers.get('content-type'),'audio/ogg');assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0,4).toString(),'OggS');}else if(name.endsWith('.woff'))assert.equal(res.headers.get('content-type'),'font/woff');}const res=await fetch('http://127.0.0.1:31994/beach-panorama.jpg');assert.equal(res.status,404);console.log('PASS: real Tidewater vegetation geometry and LOD, coastal meshes and waves, projected palm shadows, airborne ball shadows, fonts, full banner and sound assets.');}finally{cp.kill()}})().catch(e=>{console.error(e);cp.kill();process.exitCode=1});
