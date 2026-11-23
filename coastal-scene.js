/* Lightweight Three.js adaptation of Tidewater's procedural coastal vegetation.
 * Plant meshes: Tidewater (Dan Greenheck / DRG Software Solutions LLC, MIT).
 * No screenshots, panoramas, imported world simulation or walkable distant islands. */
(function(root,T,plants){
'use strict';
const rnd=plants.mulberry32,lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function geom(p,uv,idx,colors){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(colors)g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();g.computeBoundingSphere();return g;}
function splitPlant(source,filter,transform){const p=[],uv=[],idx=[],old=source.attributes.position,mt=source.attributes.aMat,tex=source.attributes.uv,veg=source.attributes.aVeg,remap=new Map();function add(i){if(remap.has(i))return remap.get(i);let n=p.length/3;remap.set(i,n);let x=old.getX(i),y=old.getY(i),z=old.getZ(i),q=transform?transform(x,y,z,mt.getX(i),veg.getX(i)):[x,y,z];p.push(...q);uv.push(tex.getX(i),tex.getY(i));return n;}for(let i=0;i<source.index.count;i+=3){let a=source.index.getX(i),b=source.index.getX(i+1),c=source.index.getX(i+2);if(filter(mt.getX(a)))idx.push(add(a),add(b),add(c));}return geom(p,uv,idx);}
function palmModel(seed=11,detail=true){const original=plants.buildPalmNear(seed).geometry,mt=original.attributes.aMat,old=original.attributes.position,uv=original.attributes.uv;
 const lean=(x,y,z,part,u)=>part===0?[x+1.3*u*(2-u),y,z+.35*u]:[x+1.3,y+10,z+.35];
 const trunk=splitPlant(original,p=>p!==1,lean),positions=[],indices=[],cols=[],outlines=[],r=rnd(seed+53);
 const color=new T.Color(),q=new T.Vector3();
 // Tidewater's exact curved rachis and wing surfaces, converted from its GPU
 // leaflet mask into actual tapered leaf geometry (so silhouette/shadow agree).
 let start=0;while(start<mt.count&&mt.getX(start)!==1)start++;
 const step=27;
 for(let base=start;base+step<=mt.count;base+=step){if(mt.getX(base)!==1)continue;
   function point(s,t){s=clamp(s,0,1);t=clamp(t,0,1);let a=Math.min(7,Math.floor(s*8)),b=Math.min(1,Math.floor(t*2)),u=s*8-a,v=t*2-b;let A=base+a*3+b,B=A+3;
    function f(k){return lerp(lerp(old[k](A),old[k](A+1),v),lerp(old[k](B),old[k](B+1),v),u);}
    return lean(f('getX'),f('getY'),f('getZ'),1,1);}
   function leaflet(s,width){let n=positions.length/3,profile=[[0,0],[.34,.75],[.64,1],[.85,.65],[1,0]];
     color.setHSL(.245+r()*.046,.49+r()*.18,.22+r()*.15);
     for(let i=0;i<profile.length;i++){let t=profile[i][0],w=width*profile[i][1],center=s+.035*t*t;for(let sign of [-1,0,1]){let v=point(center+w*sign,t);if(sign===0)v[1]+=.032*Math.sin(t*Math.PI);positions.push(...v);let shade=sign===0?1.13:sign===1?.86:1;cols.push(color.r*shade,color.g*shade,color.b*shade);}}
     outlines.push([n,n+3,n+6,n+9,n+12,n+14,n+11,n+8,n+5,n+2]);
     for(let j=0;j<4;j++)for(let k=0;k<2;k++){let a=n+j*3+k;indices.push(a,a+3,a+1,a+1,a+3,a+4);}}
   for(let s=.18;s<.965;s+=detail?.041:.075)leaflet(s,(detail?.018:.032)*(.7+r()*.5));
   // thin central rib
   const n=positions.length/3;for(let i=0;i<=8;i++){let s=i/8;for(let t of [0,.035]){positions.push(...point(s,t));cols.push(.24,.33,.085);}}
   outlines.push([...Array.from({length:9},(_,i)=>n+i*2),...Array.from({length:9},(_,i)=>n+17-i*2)]);
   for(let i=0;i<8;i++){let a=n+i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
 }
 original.dispose();const leaves=geom(positions,null,indices,cols);leaves.userData.outlines=outlines;leaves.userData.rest=Float32Array.from(positions);return {trunk,leaves};
}
function treeModel(name,seed){const src=plants[name](seed).geometry,branch=splitPlant(src,p=>p===0||p===5),canopy=splitPlant(src,p=>p!==0&&p!==5);src.dispose();return {branch,canopy};}
function grassModel(seed=12){const r=rnd(seed),p=[],idx=[],colors=[],col=new T.Color();
 // Dune grass form from Tidewater GrassField.PatchBuilder.blade: tapered curved
 // rows, golden-angle distribution; retain geometry rather than GPU terrain cells.
 for(let k=0;k<8;k++){let az=k*2.39996+r()*.45,dx=Math.cos(az),dz=Math.sin(az),lean=.2+r()*.75,H=13+r()*20,curve=.2+r()*.45,w=.65+r()*.64,n=p.length/3,baseX=(r()-.5)*3,baseZ=(r()-.5)*3;
   col.setHSL(.17+r()*.07,.37+r()*.20,.29+r()*.18);
   for(let h of [0,.34,.67,1]){let out=(Math.sin(lean)*h+curve*h*h)*H,up=(Math.cos(lean)*h-curve*.35*h*h)*H,hw=w*(1-Math.pow(h,1.6))*(.75+.25*(1-h));for(let s of [-1,1]){p.push(baseX+dx*out-s*dz*hw,up,baseZ+dz*out+s*dx*hw);colors.push(col.r*(.62+.38*h),col.g*(.62+.38*h),col.b*(.62+.38*h));}}
   for(let j=0;j<3;j++){let a=n+j*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
 return geom(p,null,idx,colors);}
function canvasTexture(size,paint){const c=document.createElement('canvas');c.width=c.height=size;paint(c.getContext('2d'),size);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;}
function barkMap(){return canvasTexture(256,(c,s)=>{const r=rnd(516);c.fillStyle='#77705b';c.fillRect(0,0,s,s);for(let i=0;i<4800;i++){let x=r()*s,y=r()*s;c.fillStyle=r()<.5?'#b5a99140':'#362c2538';c.fillRect(x,y,.6+r()*3,1+r()*8);}for(let i=0;i<20;i++){let y=i*s/20;c.strokeStyle='#463e3399';c.lineWidth=1+r()*1.6;c.beginPath();for(let j=0;j<=s;j+=4){let l=y+Math.sin(j*.055+i)*1.2;if(j)c.lineTo(j,l);else c.moveTo(j,l);}c.stroke();c.strokeStyle='#b4a98c70';c.lineWidth=1;c.beginPath();c.moveTo(0,y+2);c.lineTo(s,y+2);c.stroke();}});}
function leafCards(){return canvasTexture(256,(c,s)=>{const r=rnd(132);for(let i=0;i<235;i++){let a=r()*Math.PI*2,d=Math.sqrt(r())*.49,x=(.5+Math.cos(a)*d)*s,y=(.5+Math.sin(a)*d)*s,L=7+r()*13;c.save();c.translate(x,y);c.rotate(r()*Math.PI);c.fillStyle=['#354d22','#597b32','#46662c','#6d8640','#2e542c'][Math.floor(r()*5)];c.beginPath();c.ellipse(0,0,L,L*(.31+r()*.18),0,0,Math.PI*2);c.fill();c.strokeStyle='#a8a45b55';c.lineWidth=.65;c.beginPath();c.moveTo(-L*.8,0);c.lineTo(L*.8,0);c.stroke();c.restore();}});}
function coastalLayout(sp,sun){const pet=sp.onlineMode==='petanque',carom=sp.onlineMode?.startsWith('carom'),extent=pet?2450:carom?1100:1300,coast=-extent-160,sz=pet?650:160,r=rnd(518),near=[];
 const sx=sun.x/sun.y,sy=sun.z/sun.y;
 // Place crowns toward the sun so projected fronds fall onto the court,
 // without bringing trunks or foliage into the reachable playing boundary.
 for(let i=0;i<(pet?5:3);i++){let h=pet?580+r()*145:310+r()*105,z=pet?(i-2)*380:(i-1)*130,x=(i%2?35:-45);near.push({x:x+sx*h*.97,z:z+sy*h*.97,y:0,s:h/10,a:r()*6.283,near:true});}
 for(let i=0;i<7;i++){let h=420+r()*350;near.push({x:coast+280+r()*650,z:(r()-.5)*(pet?3000:2000),y:-2,s:h/10,a:r()*6.283,near:false});}
 // The game supplies genuinely excavated pits. Remove any coarse coastal
 // triangles under that portion of the sand court, not just their colour.
 let pits=sp.onlineMode==='pool'?sp.pockets:sp.onlineMode==='hole'?[sp.hole]:null,cut=null;
 if(pits&&pits.length){pits=pits.filter(h=>h&&Number.isFinite(h.x)&&Number.isFinite(h.z));if(pits.length)cut={x0:Math.min(...pits.map(h=>h.x-h.r-1)),x1:Math.max(...pits.map(h=>h.x+h.r+1)),z0:Math.min(...pits.map(h=>h.z-h.r-1)),z1:Math.max(...pits.map(h=>h.z+h.r+1))};}
 if(!sp.onlineMode||sp.onlineMode==='ring'){let r=sp.ringR+5;cut={x0:-r,x1:r,z0:-r,z1:r};}
 return {extent,coast,near,pet,carom,sz,cut};}
function shoreX(coast,z){return coast+105*Math.sin(z*.0015)+55*Math.sin(z*.0037+.8);}
function terrainHeight(x,z,L){let edge=x-shoreX(L.coast,z);if(edge<0)return -23+edge*.008;let bank=Math.min(1,edge/170),outer=Math.max(0,Math.abs(z)-L.extent, x-L.extent);return -.12-22*(1-bank)+Math.max(0,Math.sin(z*.0016)*Math.cos(x*.0021))*Math.min(120,outer*.07);}
function makeTerrain(L){let p=[],colors=[],idx=[],N=100,M=100,c=new T.Color();let sand=new T.Color('#d4bc93'),wet=new T.Color('#a8936d'),grass=new T.Color('#75804a'),r=rnd(117);
 for(let z=0;z<=M;z++){let wz=lerp(-14000,14000,z/M),coast=shoreX(L.coast,wz);for(let x=0;x<=N;x++){let wx=lerp(coast-70,14500,x/N),y=terrainHeight(wx,wz,L),d=wx-coast;let green=clamp((wx-L.extent-1300+450*Math.sin(wz*.001))/1900,0,1)*(.6+.4*r());c.copy(sand).lerp(wet,clamp(1-d/200,0,1)).lerp(grass,green);c.multiplyScalar(.94+r()*.12);p.push(wx,y,wz);colors.push(c.r,c.g,c.b);if(x<N&&z<M){let a=z*(N+1)+x,b=a+N+1;idx.push(a,b,a+1,b,b+1,a+1);}}}
 if(L.cut){const q=L.cut,kept=[];for(let i=0;i<idx.length;i+=3){let a=idx[i]*3,b=idx[i+1]*3,d=idx[i+2]*3;let x0=Math.min(p[a],p[b],p[d]),x1=Math.max(p[a],p[b],p[d]),z0=Math.min(p[a+2],p[b+2],p[d+2]),z1=Math.max(p[a+2],p[b+2],p[d+2]);if(x0<=q.x1&&x1>=q.x0&&z0<=q.z1&&z1>=q.z0)continue;kept.push(idx[i],idx[i+1],idx[i+2]);}idx=kept;}
 return geom(p,null,idx,colors);}
function hills(seed,x,z,rx,rz,h){const r=rnd(seed),p=[],c=[],id=[],N=35,col=new T.Color();for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){let u=i/N*2-1,v=j/N*2-1,d=Math.hypot(u,v),noise=.8+.11*Math.sin(u*14+v*5)+.08*Math.cos(v*19-u*4),y=h*Math.pow(Math.max(0,1-d*d),1.35)*noise-15;let a=clamp(y/h,0,1);col.setHSL(.24-.025*a,.28+.18*(1-a),.27+.13*a);col.multiplyScalar(.88+r()*.19);p.push(x+u*rx,y,z+v*rz);c.push(col.r,col.g,col.b);if(i<N&&j<N){let k=j*(N+1)+i,l=k+N+1;id.push(k,l,k+1,l,l+1,k+1);}}return geom(p,null,id,c);}
function swayLeaves(leaves,t,wind){
 const pos=leaves.attributes.position,rest=leaves.userData.rest;
 const speed=Math.min(7,Math.max(.8,wind?.speed||2.4));
 const strength=.035+speed*.022,heading=wind?.angle??Math.PI/3;
 for(let i=0;i<pos.count;i++){
   const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2],dx=x-1.3,dz=z-.35;
   const bend=Math.min(1,Math.hypot(dx,dz)/3),phase=dx*.9+dz*.6;
   const swing=bend*bend*strength*(Math.sin(t*1.9+phase)+.32*Math.sin(t*4.3+phase*2));
   pos.setXYZ(i,x+swing*(Math.cos(heading)+.25*Math.cos(phase)),y+swing*.72,z+swing*(Math.sin(heading)+.25*Math.sin(phase)));
 }
 pos.needsUpdate=true;
}
function shadowTexture(model,layout,sun,size,texture,resolution=1024){
 const c=texture?.image||document.createElement('canvas');
 if(!texture)c.width=c.height=resolution;
 const ctx=c.getContext('2d'),scale=c.width/size,half=c.width/2;
 ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
 const pos=model.leaves.attributes.position,outlines=model.leaves.userData.outlines;
 const trunk=model.trunk.attributes.position,triangles=model.trunk.index;
 // All projected faces use the same winding. Overlapping fronds and stems
 // form one silhouette, so crossings neither erase it nor create a darker seam.
 function polygon(points){
   let area=0;
   for(let i=0;i<points.length;i++){
     const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-a[1]*b[0];
   }
   if(Math.abs(area)<.001)return;
   const ordered=area<0?points.slice().reverse():points;
   ctx.moveTo(...ordered[0]);for(let i=1;i<ordered.length;i++)ctx.lineTo(...ordered[i]);ctx.closePath();
 }
 ctx.fillStyle='rgba(35,35,35,.60)';ctx.beginPath();
 for(const palm of layout.near.filter(p=>p.near)){
   const C=Math.cos(palm.a),S=Math.sin(palm.a);
   const project=(x,y,z)=>{const h=(palm.y||0)+y*palm.s;return [half+(palm.x+(x*C+z*S)*palm.s-h*sun.x/sun.y)*scale,half+(palm.z+(-x*S+z*C)*palm.s-h*sun.z/sun.y)*scale];};
   const leafPoints=Array.from({length:pos.count},(_,j)=>project(pos.getX(j),pos.getY(j),pos.getZ(j)));
   for(const outline of outlines)polygon(outline.map(j=>leafPoints[j]));
   // Use the actual curved, tapered trunk and coconuts. No extra painted line.
   const trunkPoints=Array.from({length:trunk.count},(_,j)=>project(trunk.getX(j),trunk.getY(j),trunk.getZ(j)));
   for(let i=0;i<triangles.count;i+=3)polygon([trunkPoints[triangles.getX(i)],trunkPoints[triangles.getX(i+1)],trunkPoints[triangles.getX(i+2)]]);
 }
 ctx.fill('nonzero');
 const tex=texture||new T.CanvasTexture(c);tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;tex.needsUpdate=true;return tex;
}
let models=null,world=null;
function initModels(){if(!models){const palm=palmModel(),farPalm=palmModel(11,false),tree=treeModel('buildTreeNear',21),shrub=treeModel('buildShrubNear',31);models={palm,farPalm,tree,shrub,grass:grassModel(),bark:barkMap(),leaf:leafCards()};}return models;}
function instances(group,g,mat,points){
 // Three r149 does not calculate world bounds for instanced plants. Group
 // plants by location so distant geometry outside the camera can be skipped.
 const cells=new Map(),cellSize=1800;
 for(const p of points){const key=Math.floor(p.x/cellSize)+':'+Math.floor(p.z/cellSize);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(p);}
 if(!g.boundingBox)g.computeBoundingBox();
 const o=new T.Object3D(),c=new T.Color(),box=new T.Box3(),meshes=[];
 for(const cell of cells.values()){
   const mesh=new T.InstancedMesh(g,mat,cell.length),bounds=new T.Box3();let margin=0;
   for(let i=0;i<cell.length;i++){
     const p=cell[i];o.position.set(p.x,p.y||0,p.z);o.rotation.set(0,p.a||0,0);o.scale.setScalar(p.s);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);
     c.setHSL(.18,.12,.74+(i%5)*.045);mesh.setColorAt(i,c);
     bounds.union(box.copy(g.boundingBox).applyMatrix4(o.matrix));margin=Math.max(margin,p.s*.65);
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.receiveShadow=true;
   mesh.userData.coastalBounds=bounds.expandByScalar(margin);mesh.userData.shared=true;group.add(mesh);meshes.push(mesh);
 }
 return meshes;
}
function makeSea(L){const g=new T.PlaneGeometry(29000,29000);g.rotateX(-Math.PI/2);const mat=new T.ShaderMaterial({uniforms:{time:{value:0},coast:{value:L.coast},dayTint:{value:new T.Vector3(1,1,1)}},vertexShader:'varying vec3 vP;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vP;uniform float time;uniform float coast;uniform vec3 dayTint;void main(){float shore=coast+105.*sin(vP.z*.0015)+55.*sin(vP.z*.0037+.8);float d=shore-vP.x;float wave=sin(d*.051+time*1.8+sin(vP.z*.009)*1.2)+.43*sin(vP.x*.12+vP.z*.027-time*2.);float near=smoothstep(-70.,650.,d);vec3 c=mix(vec3(.11,.43,.39),vec3(.018,.21,.32),near);float foam=(1.-smoothstep(6.,35.,abs(d-12.-sin(time*.68+vP.z*.009)*19.)))*.86;foam+=pow(max(0.,wave*.7-.24),4.)*.3*(1.-smoothstep(100.,1600.,d));c+=vec3(.025,.06,.07)*wave; c=mix(c,vec3(.76,.84,.79),clamp(foam,0.,1.));float haze=smoothstep(2500.,14500.,distance(cameraPosition.xz,vP.xz));c=mix(c,vec3(.42,.60,.69),haze*.8);gl_FragColor=vec4(c*dayTint,1.);#include <encodings_fragment>}`.replace(';#include',';\n#include').replace('fragment>}','fragment>\n}'),side:T.DoubleSide,toneMapped:false});const m=new T.Mesh(g,mat);m.position.set(-12900,-18,0);m.frustumCulled=false;return m;}
function sky(){const mat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{dayTint:{value:new T.Vector3(1,1,1)}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vP;uniform vec3 dayTint;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}void main(){vec3 d=normalize(vP);float y=max(0.,d.y);vec3 c=mix(vec3(.56,.70,.76),vec3(.075,.29,.56),pow(y,.6));vec2 q=d.xz/max(.18,d.y+.22);float cloud=n(q*3.)*.53+n(q*7.)*.25+n(q*16.)*.15+n(q*31.)*.07;float w=smoothstep(.53,.72,cloud)*smoothstep(.04,.19,y);c=mix(c,vec3(.89,.88,.81),w*.9);gl_FragColor=vec4(c*dayTint,1.);\n#include <encodings_fragment>\n}`});const m=new T.Mesh(new T.SphereGeometry(23500,40,20),mat);m.frustumCulled=false;m.renderOrder=-100;return m;}
function dispose(scene){if(!world)return;scene.remove(world.group);const materials=new Set();world.group.traverse(o=>{if(o.isMesh){if(!o.userData.shared)o.geometry.dispose();if(o.material&&!o.userData.sharedMaterial)materials.add(o.material);}});materials.forEach(m=>m.dispose());world=null;}
function build(scene,sp,sun){dispose(scene);const L=coastalLayout(sp,sun),m=initModels(),group=new T.Group(),r=rnd(785);group.name='Tidewater-3D-coast';scene.background=new T.Color('#a9c9d7');scene.fog=new T.FogExp2('#aec5c4',.000037);
 let sk=sky();group.add(sk);let sea=makeSea(L);group.add(sea);
 let land=new T.Mesh(makeTerrain(L),new T.MeshLambertMaterial({vertexColors:true}));land.name='coastal-terrain';land.receiveShadow=true;group.add(land);
 for(let i=0;i<7;i++){let a=i/6,mesh=new T.Mesh(hills(310+i,lerp(-11900,11600,a),-11100+1700*Math.sin(a*3.14),3800+r()*2400,2900+r()*2500,1100+r()*2400),new T.MeshLambertMaterial({vertexColors:true}));group.add(mesh);}
 for(let i=0;i<3;i++){let mesh=new T.Mesh(hills(450+i,-11300-i*2300,4000+i*3200,1900+i*180,2400,600+r()*900),new T.MeshLambertMaterial({vertexColors:true}));group.add(mesh);}
 let palms=L.near.slice(),farPalms=[],trees=[],shrubs=[],grass=[];
 for(let i=0;i<24;i++){let x=L.extent+450+r()*2300,z=(r()-.5)*6500;farPalms.push({x,z,y:terrainHeight(x,z,L),s:49+r()*48,a:r()*6.283});}
 for(let i=0;i<52;i++){let x=L.extent+700+r()*4800,z=(r()-.5)*10000;trees.push({x,z,y:terrainHeight(x,z,L),s:58+r()*72,a:r()*6.283});}
 for(let i=0;i<85;i++){let x=L.coast+230+r()*630,z=(r()-.5)*9000;shrubs.push({x,z,y:terrainHeight(x,z,L),s:15+r()*30,a:r()*6.283});}
 for(let i=0;i<550;i++){let z=(r()-.5)*Math.max(5000,L.extent*3),x=i%2?L.coast+210+r()*440:L.extent+100+r()*1100;grass.push({x,z,y:terrainHeight(x,z,L),s:.6+r()*1.8,a:r()*6.283});}
 let W=sp.board?.w??Math.max(130,(sp.ringCm||25)*1.5),H=sp.board?.h??W;
 for(let i=0;i<150;i++){let x=(r()-.5)*(W*2+460),z=(r()-.5)*(H*2+460);if(Math.abs(x)<W+42&&Math.abs(z)<H+42)continue;if(Math.sin(x*.034+z*.023)+Math.cos(z*.014)<.45)continue;grass.push({x,z,y:.02,s:.28+r()*.48,a:r()*6.283});}
 const bark=new T.MeshLambertMaterial({map:m.bark,color:0xffffff}),leaf=new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),card=new T.MeshLambertMaterial({map:m.leaf,alphaTest:.48,side:T.DoubleSide,color:0xe0e8c1});
 const batches=[instances(group,m.palm.trunk,bark,palms.concat(farPalms)),instances(group,m.palm.leaves,leaf,palms),instances(group,m.farPalm.leaves,leaf,farPalms),instances(group,m.tree.branch,bark,trees),instances(group,m.tree.canopy,card,trees),instances(group,m.shrub.branch,bark,shrubs),instances(group,m.shrub.canopy,card,shrubs),instances(group,m.grass,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}),grass)].flat();
 scene.add(group);world={group,sea,sky:sk,layout:L,batches};return L;
}
const cameraFrustum=new T.Frustum(),cameraMatrix=new T.Matrix4();
function syncView(now,camera){
 if(!world)return;
 world.sky.position.copy(camera.position);world.sea.material.uniforms.time.value=now*.001;
 if(camera.projectionMatrix&&camera.matrixWorldInverse){
   cameraFrustum.setFromProjectionMatrix(cameraMatrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
   for(const mesh of world.batches)mesh.visible=cameraFrustum.intersectsBox(mesh.userData.coastalBounds);
 }
}
function update(now,camera,wind,reduceMotion=false,interval=450){
 if(!world)return false;syncView(now,camera);
 if(reduceMotion||now-(world.lastSway??-Infinity)<interval)return false;
 const elapsed=world.lastSway===undefined?interval:Math.min(interval,now-world.lastSway);
 world.lastSway=now;world.swayTime=(world.swayTime||0)+elapsed*.00045;
 const m=initModels();swayLeaves(m.palm.leaves,world.swayTime,wind);
 if(world.shade)shadowTexture(m.palm,world.layout,world.shade.sun,world.shade.size,world.shade.texture);
 return true;
}
function shade(sp,sun,tier=2){const L=world?.layout||coastalLayout(sp,sun),size=L.pet?2800:L.carom?800:Math.max(650,(sp.ringCm||260)*2.4);const texture=shadowTexture(initModels().palm,L,sun,size,null,tier===0?512:1024);if(world)world.shade={texture,size,sun:sun.clone()};return {texture,size};}
function setDaylight(scene,period){
 const settings={morning:[[1,1,1],[1,1,1],'#aec5c4',.000037],noon:[[1.12,1.12,1.08],[1.08,1.13,1.15],'#b4d5df',.000030],afternoon:[[1.08,.58,.35],[.82,.68,.56],'#ba987b',.000055],night:[[.027,.05,.11],[.025,.045,.08],'#0a1324',.00022]};
 const p=settings[period]||settings.morning;
 if(world){world.sky.material.uniforms.dayTint.value.set(...p[0]);world.sea.material.uniforms.dayTint.value.set(...p[1]);}
 scene.background=new T.Color(p[2]);scene.fog=new T.FogExp2(p[2],p[3]);
}
const api={build,dispose,update,syncView,shade,setDaylight,palmModel,grassModel,coastalLayout,terrainHeight,shoreX};if(typeof module==='object'&&module.exports)module.exports=api;else root.CoastalScene=api;
})(typeof globalThis!=='undefined'?globalThis:this,typeof module==='object'&&module.exports?require('./three.min.js'):THREE,typeof module==='object'&&module.exports?require('./tide-plants'):TidePlants);
