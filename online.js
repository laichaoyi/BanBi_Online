(()=>{'use strict';
const $=id=>document.getElementById(id), el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=text;return x}, modeNames=Object.fromEntries(Object.entries(BiGuide.modes).filter(([id])=>id!=='solo').map(([id,m])=>[id,id==='ring'?'Bắn bi vòng tròn':m.name])), rules=Object.fromEntries(Object.entries(BiGuide.modes).map(([id,m])=>[id,m.short]));
// On GitHub Pages only, send live room requests to the separately hosted Node server.
const pagesHosted=location.hostname.endsWith('.github.io');
const apiOrigin=(()=>{
 if(!pagesHosted)return '';
 try{const url=new URL(window.BANBI_API_ORIGIN);return url.protocol==='https:'?url.origin:'';}catch{return '';}
})();
window.BANBI_SERVER_ORIGIN=apiOrigin;
const offlineMessage=pagesHosted?'Không kết nối được máy chủ chơi mạng. Kiểm tra cấu hình máy chủ HTTPS hoặc đợi máy chủ khởi động.':'Không kết nối được máy chủ. Mở dev.bat rồi tải lại trang.';
const colors=['#e34843','#eeb536','#408ce7','#3ab77e','#eae9de','#46465a','#cb67df','#8a6953'];
let saved='';try{saved=sessionStorage.getItem('bi-token')||''}catch{}let token=saved,data=null,active=false,pending=false,screen='',invite=new URL(location.href).searchParams.get('room'),toastTimer,connected=false;
const launch=el('button','','');launch.id='bi-launch';launch.innerHTML='<img src="./marbles.png" alt=""> Chơi mạng';document.querySelector('#app .bar').append(launch);
const musicOpen=el('button','','♫ Nhạc');musicOpen.id='bi-music-open';document.querySelector('#app .bar').append(musicOpen);
const introOnline=el('button','','Chơi mạng');introOnline.id='bi-intro-online';introOnline.onclick=()=>open();$('bPlay').after(introOnline);
const shell=el('section');shell.id='bi-shell';shell.hidden=true;shell.innerHTML=`<header class="bi-top"><img src="./marbles.png" alt=""><div><span class="bi-mast-kicker">TRÒ CHƠI SÂN XÓM · 1950</span><h1>Bắn Bi online</h1><div class="bi-sub" id="bi-online-state">Đang kết nối…</div></div><div class="bi-grow"></div><button id="bi-profile-btn" class="bi-profile-btn"><img alt="" id="bi-profile-thumb"><span>Chân dung</span></button><button id="bi-guide-top">Cách chơi</button><div id="bi-lobby-music-slot"></div><button id="bi-music-top">♫ Nhạc</button><button id="bi-close">Về chơi đơn</button></header><main id="bi-content"></main><footer class="bi-folk-footer"><span>❖ &nbsp; Tác giả: Andy N Le · Zalo: 0868231181 &nbsp; ❖</span></footer>`;document.body.append(shell);const notice=el('div');notice.id='bi-notice';notice.hidden=true;document.body.append(notice);
function toast(t){$('bi-notice').textContent=t;$('bi-notice').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('bi-notice').hidden=true,5000)}
function button(text,fn,cls=''){const b=el('button',cls,text);b.onclick=fn;return b}
let guideShade=null;
function openModeGuide(mode){if(guideShade)return;const previous=document.activeElement,shade=guideShade=el('div','bi-dialog-shade bi-guide-shade'),box=el('section','bi-guide-modal'),head=el('header','bi-guide-heading'),closeBtn=button('Đóng',close),content=el('div','bi-guide-content');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Cách chơi Bắn Bi online');head.append(el('h2','','Cách chơi'),closeBtn);BiGuide.render(document,content,mode||'solo');box.append(head,content);shade.append(box);document.body.append(shade);
 const base=shell.hidden?$('app'):shell,wasInert=base.inert;base.inert=true;
 function close(){if(!guideShade)return;shade.remove();guideShade=null;base.inert=wasInert;document.removeEventListener('keydown',keys,true);previous?.focus?.()}
 function keys(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}if(e.key==='Tab'){const focusable=Array.from(box.querySelectorAll('button,summary,a[href]')).filter(n=>n.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
 shade.onclick=e=>{if(e.target===shade)close()};document.addEventListener('keydown',keys,true);closeBtn.focus();
}
$('bi-guide-top').onclick=()=>openModeGuide(data?.room?.mode||$('bi-create-mode')?.value||'solo');
const Folk=window.FolkAvatar;
function avatarImg(v,cls){const img=el('img',cls);img.alt='Chân dung người chơi';img.src=Folk.url(v);img.onerror=()=>{img.onerror=null;img.src=Folk.url('folk:ti')};return img}
let restoredToken=null,profileShade=null;
function refreshAvatar(v){const thumb=$('bi-profile-thumb');if(thumb.dataset.avatar!==v.avatar){thumb.dataset.avatar=v.avatar;thumb.src=Folk.url(v.avatar)}if(restoredToken!==v.token){restoredToken=v.token;try{const saved=JSON.parse(localStorage.getItem('bi-profile-v1')||'null');if(saved&&((saved.photo&&!v.avatar.startsWith('photo:'))||(saved.avatar&&saved.avatar!==v.avatar)))setTimeout(()=>act('avatar',saved),0)}catch{}}}
async function croppedPhoto(file){if(!file||!file.type.startsWith('image/')||file.size>10*1024*1024)throw Error('Chọn ảnh dưới 10 MB.');const src=URL.createObjectURL(file);try{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=c.height=160;const side=Math.min(img.naturalWidth,img.naturalHeight);c.getContext('2d').drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,160,160);for(let quality=.86;quality>.3;quality-=.1){const jpg=c.toDataURL('image/jpeg',quality);if(jpg.length<43100)return jpg;}throw Error('Ảnh quá lớn. Thử ảnh khác nhé.')}finally{URL.revokeObjectURL(src)}}
function openProfile(){if(!data||profileShade)return;let draft={avatar:data.avatar},current=data.avatar;const shade=profileShade=el('div','bi-dialog-shade bi-profile-shade'),box=el('section','bi-profile-modal');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Chọn chân dung');const preview=avatarImg(current,'bi-profile-preview'),title=el('h2','','Chân dung sân xóm'),sub=el('p','bi-sub','Chọn một nhân vật tranh in dân gian, tạo chân dung ngẫu nhiên hoặc dùng ảnh riêng.');const grid=el('div','bi-avatar-grid');function choose(id){draft={avatar:id};current=id;preview.src=Folk.url(id);for(const b of grid.children)b.classList.toggle('selected',b.dataset.avatar===id);save.disabled=false}for(const p of Folk.presets){const id='folk:'+p.id,b=button('',()=>choose(id),'bi-avatar-choice');b.dataset.avatar=id;b.classList.toggle('selected',id===current);b.append(avatarImg(id,'bi-avatar-choice-img'),el('span','',p.name));grid.append(b)}
 const upload=el('input');upload.type='file';upload.accept='image/*';upload.hidden=true;const fileButton=button('Tải ảnh của tôi',()=>upload.click());upload.onchange=async()=>{try{const jpg=await croppedPhoto(upload.files[0]);draft={photo:jpg.split(',')[1]};preview.src=jpg;for(const b of grid.children)b.classList.remove('selected');save.disabled=false}catch(e){toast(e.message)}};
 function close(){shade.remove();profileShade=null;document.removeEventListener('keydown',keys,true)}function keys(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close()}}const actions=el('div','bi-profile-actions'),save=button('Lưu chân dung',async()=>{save.disabled=true;if(await act('avatar',draft)){try{localStorage.setItem('bi-profile-v1',JSON.stringify(draft))}catch{}close();toast('Đã đổi chân dung.')}else save.disabled=false},'bi-main');save.disabled=true;actions.append(button('Quay lại',close),save);const options=el('div','bi-profile-actions');options.append(button('Tạo chân dung khác',()=>choose(Folk.random())),fileButton);box.append(el('span','bi-badge','GƯƠNG MẶT SÂN XÓM'),title,sub,preview,grid,options,upload,actions);shade.append(box);document.body.append(shade);shade.onclick=e=>{if(e.target===shade)close()};document.addEventListener('keydown',keys,true);}
$('bi-profile-btn').onclick=openProfile;
let modalResolve=null;
function dialog({title,desc,yes='Đồng ý',no='Quay lại',danger=false,value=null}){if(modalResolve)modalResolve(false);return new Promise(resolve=>{const shade=el('div','bi-dialog-shade'),box=el('section','bi-dialog');shade.id='bi-dialog-shade';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','bi-dialog-title');const previous=document.activeElement;let closed=false;function finish(ok){if(closed)return;closed=true;modalResolve=null;shade.remove();document.removeEventListener('keydown',keys,true);previous?.focus?.();resolve(ok)}function keys(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false)}if(e.key==='Tab'){const items=Array.from(box.querySelectorAll('button,input'));if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus()}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus()}}}modalResolve=finish;const icon=el('div','bi-dialog-icon',danger?'!':'◆'),h=el('h2','',title);h.id='bi-dialog-title';box.append(icon,h,el('p','',desc));let input;if(value!==null){input=el('input','bi-dialog-link');input.value=value;input.readOnly=true;input.onclick=()=>input.select();box.append(input)}const actions=el('div','bi-dialog-actions'),cancel=button(no,()=>finish(false)),ok=button(yes,()=>finish(true),danger?'bi-dialog-danger':'primary');actions.append(cancel,ok);box.append(actions);shade.append(box);document.body.append(shade);shade.onclick=e=>{if(e.target===shade)finish(false)};document.addEventListener('keydown',keys,true);(input||cancel).focus();if(input)input.select();});}
const ask=(title,desc,yes='Đồng ý',danger=false)=>dialog({title,desc,yes,danger});
function selectMode(id,value){const s=el('select');s.id=id;Object.entries(modeNames).forEach(([k,v])=>{const o=el('option','',v);o.value=k;s.append(o)});s.value=value||'ring';return s}
async function api(body){
 const previous=data?.room,known=previous?.game?.last;
 const query=!body&&known?.frames?('?'+new URLSearchParams({room:previous.code,round:previous.round,shot:known.n})):'';
 const response=await fetch(apiOrigin+(body?'/api/action':'/api/state'+query),{method:body?'POST':'GET',headers:{'X-Player-Token':token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const v=await response.json();if(!response.ok)throw Error(v.error||'Lỗi kết nối');
 const fresh=v.room;
 if(known?.frames&&fresh?.code===previous.code&&fresh.round===previous.round&&fresh.game?.last?.n===known.n&&!fresh.game.last.frames)fresh.game.last=known;
 if(token!==v.token){token=v.token;try{sessionStorage.setItem('bi-token',token)}catch{}}
 return v;
}
function accept(v){data=v;connected=true;$('bi-online-state').textContent='● Trực tuyến · '+v.name;if(v.notice)toast(v.notice);refreshAvatar(v);render()}
async function act(action,extras={}){for(let i=0;pending&&i<150;i++)await new Promise(r=>setTimeout(r,20));if(pending){toast('Máy chủ chưa phản hồi. Thử lại nhé.');return false}pending=true;try{accept(await api({action,...extras}));return true}catch(e){toast(e.message);return false}finally{pending=false}}
async function poll(){if(!active||pending)return;pending=true;try{accept(await api());if(invite&&!data.room){const code=invite;invite=null;pending=false;await act('join',{code});}else invite=null}catch(e){connected=false;$('bi-online-state').textContent='○ Mất kết nối · '+offlineMessage;if(!data)render()}finally{pending=false}}
function cleanupMatch(){dismissVictory();if(!$('app').classList.contains('bi-original-match'))return;window.__bi3d?.exit();$('app').classList.remove('bi-original-match');document.body.classList.remove('bi-in-match','bi-mobile-info');['bi-match-panel','bi-room-btn','bi-back','bi-aim-btn','bi-shot-btn'].forEach(id=>$(id)?.remove());$('shotsBox').querySelector('span').textContent='lượt còn lại';$('bView').querySelector('.vl-l').textContent='Toàn vòng';$('bView').querySelector('.vl-s').textContent='Vòng';}
function open(){
 if(pagesHosted&&!apiOrigin){
   dialog({title:'Chơi mạng cần máy chủ',desc:'Chơi đơn trên GitHub Pages đã sẵn sàng. Chủ trang cần triển khai server.js trên máy chủ Node.js HTTPS và điền địa chỉ vào pages-config.js để mở phòng.' ,yes:'Đã hiểu',no:'Quay lại'});
   return;
 }
 active=true;shell.hidden=false;poll();render()
};launch.onclick=open;$('bi-close').onclick=async()=>{if(data?.room){if(!await ask('Rời phòng?','Bạn sẽ rời phòng hiện tại và trở về chế độ chơi đơn.','Về chơi đơn',true))return;if(!await act('leave'))return}active=false;shell.hidden=true;cleanupMatch();screen='';syncMusic()};setInterval(poll,550);
function card(title){const c=el('div','bi-card');c.append(el('h3','',title));return c}
function changeScreen(id){if(screen===id)return false;if(screen.startsWith('match:'))cleanupMatch();screen=id;shell.hidden=false;$('bi-content').replaceChildren();return true}
function lobby(){if(changeScreen('lobby')){const wrap=el('div','bi-wrap bi-lobby-wrap');wrap.innerHTML='<div class="bi-hero"><span class="bi-badge">SÂN BI XÓM NHỎ</span><h2>Hẹn nhau một ván bi.</h2><div>Tạo phòng, rủ bạn và chơi bắn bi, bida Carom và bi sắt. Chưa có bạn? NPC sẵn sàng chơi cùng.</div></div>';const grid=el('div','bi-grid'), left=card('Mở phòng mới'), right=card('Phòng đang chờ');left.classList.add('bi-create-card');right.classList.add('bi-rooms-card');const name=el('input');name.id='bi-name';name.placeholder='Tên của bạn';name.maxLength=24;name.value=data?.name||'';const room=el('input');room.id='bi-roomname';room.placeholder='Tên phòng (không bắt buộc)';room.maxLength=45;const mode=selectMode('bi-create-mode');const rule=el('p','bi-sub',rules[mode.value]);mode.onchange=()=>rule.textContent=rules[mode.value];left.append(el('label','','Tên người chơi'),name,el('label','','Tên phòng'),room,el('label','','Kiểu chơi'),mode,rule,button('＋ Tạo phòng',async()=>{if(await act('name',{name:name.value}))await act('create',{name:room.value,mode:mode.value})},'bi-main'));const join=el('div','bi-row'), code=el('input');code.placeholder='Nhập mã phòng';code.id='bi-code';code.maxLength=12;join.append(code,button('Tham gia',async()=>{if(await act('name',{name:name.value}))await act('join',{code:code.value})}));const list=el('div','bi-list');list.id='bi-rooms';right.append(join,list);grid.append(left,right);wrap.append(grid);$('bi-content').append(wrap);}
 if(data&&!$('bi-name').value)$('bi-name').value=data.name;const list=$('bi-rooms');list.replaceChildren();if(!connected)list.append(el('p','bi-sub',offlineMessage));else if(!data?.rooms.length)list.append(el('p','bi-sub','Chưa có phòng. Hãy mở phòng đầu tiên!'));else for(const r of data.rooms){const row=el('div','bi-entry'),info=el('div','bi-grow');info.append(el('b','',r.name),el('div','bi-sub',modeNames[r.mode]+' · '+r.host+' · '+r.count+'/'+(r.mode==='petanque'?6:8)+' người · '+r.code));row.append(info,button('Vào phòng',async()=>{if(await act('name',{name:$('bi-name').value}))await act('join',{code:r.code})}));list.append(row)}}
function chatBox(){const c=card('Chat chung'), list=el('div','bi-chat');c.classList.add('bi-chat-card');list.id='bi-chatlist';list.setAttribute('role','log');const f=el('form','bi-row'), inp=el('input');inp.placeholder='Nhập tin nhắn…';inp.maxLength=300;f.append(inp,button('Gửi',()=>{}));f.lastChild.type='submit';f.onsubmit=async e=>{e.preventDefault();const msg=inp.value;if(msg.trim()&&await act('chat',{text:msg}))inp.value=''};c.append(list,f);return c}
function renderChat(r){const box=$('bi-chatlist');if(!box)return;const key=JSON.stringify(r.chat);if(box.dataset.key===key)return;const bottom=box.scrollHeight-box.scrollTop-box.clientHeight<35;box.dataset.key=key;box.replaceChildren();for(const m of r.chat){const item=el('div');item.append(el('b','',m.name+' · '+new Date(m.t).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})),el('div','',m.text));box.append(item)}if(bottom)box.scrollTop=box.scrollHeight}
async function copyInvite(r){const url=new URL(location.href);url.search='';if(['localhost','127.0.0.1'].includes(url.hostname)&&data.lanIP)url.hostname=data.lanIP;url.searchParams.set('room',r.code);try{await navigator.clipboard.writeText(url.href);toast('Đã sao chép liên kết mời!')}catch{await dialog({title:'Liên kết mời vào phòng',desc:'Sao chép đường dẫn bên dưới để gửi cho bạn bè.',yes:'Xong',no:'Đóng',value:url.href})}}
const gestures=['Búa','Bao','Kéo'];
// Use exactly the same folk-illustrated hands in the chooser and duel result.
function handArt(i){return '<img class="bi-hand-print" src="./folk-hand-'+i+'.jpg" alt="">';}
function waiting(r){
 if(changeScreen('waiting:'+r.code)){const w=el('div','bi-wrap bi-waiting');w.innerHTML='<div class="bi-hero bi-room-hero"><div class="bi-room-hero-text"><span class="bi-badge">PHÒNG CHỜ · VÁN '+(r.round+1)+'</span><h2 id="bi-roomtitle"></h2><div id="bi-roomdesc"></div></div><div class="bi-room-stamp"><span>MÃ PHÒNG</span><b id="bi-roomcode"></b><small>MỜI BẠN CÙNG CHƠI</small></div></div>';const grid=el('div','bi-grid'),left=card('Hội bạn sân bi'),p=el('div','bi-list');p.id='bi-members';const controls=el('div','bi-room-controls');controls.id='bi-controls';left.append(p,controls);grid.append(left,chatBox());w.append(grid);$('bi-content').append(w);}
 $('bi-roomtitle').textContent=r.name;$('bi-roomcode').textContent=r.code;$('bi-roomdesc').textContent=modeNames[r.mode]+' · '+r.players.length+'/'+(r.mode==='petanque'?6:8)+' người · đang chờ vào sân';const p=$('bi-members'),sig=JSON.stringify(r.players.map(x=>[x.id,x.name,x.bot,r.host,x.avatar]));if(p.dataset.sig!==sig){p.dataset.sig=sig;p.replaceChildren();for(const user of r.players){const row=el('div','bi-entry bi-member-card'),avatar=avatarImg(user.avatar,'bi-room-avatar'),info=el('div','bi-grow');avatar.dataset.bot=String(!!user.bot);info.append(el('b','',user.name+(user.id===data.me?' (Bạn)':'')),el('div','bi-sub',user.id===r.host?'Chủ phòng':user.bot?'Máy chơi cùng':'Sẵn sàng tại phòng'));row.append(avatar,info);if(data.me===r.host&&user.id!==data.me)row.append(button('Mời ra',()=>act('kick',{player:user.id}),'bi-danger'));p.append(row);}}
 const controls=$('bi-controls');if(controls.dataset.mode!==r.mode||controls.dataset.host!==r.host){controls.dataset.mode=r.mode;controls.dataset.host=r.host;controls.replaceChildren();const row=el('div','bi-row');row.append(button('Liên kết mời',()=>copyInvite(data.room)));if(data.me===r.host){const rename=el('form','bi-row bi-rename'),name=el('input');name.id='bi-rename-input';name.value=r.name;name.maxLength=45;name.placeholder='Nhập tên sân bi';name.setAttribute('aria-label','Tên phòng');let save=button('Lưu tên',()=>{});save.type='submit';rename.append(name,save);rename.onsubmit=async e=>{e.preventDefault();if(await act('rename',{name:name.value})){name.value=data.room.name;toast('Đã lưu tên phòng.')}};controls.append(el('label','bi-field-label','Tên sân bi'),rename,el('label','bi-field-label','Chọn trò chơi'));const select=selectMode('bi-mode',r.mode);select.onchange=()=>act('mode',{mode:select.value});controls.append(select,el('p','bi-sub',rules[r.mode]));row.append(button('Vào sân · oẳn tù tì',()=>act('start'),'bi-main'),button('Hủy phòng',async()=>{if(await ask('Hủy phòng?','Phòng sẽ đóng đối với tất cả người chơi.','Hủy phòng',true))act('cancel')},'bi-danger'));}else row.append(button('Rời phòng',()=>act('leave'),'bi-danger'));controls.append(row);}
 renderChat(r);
}
function rps(r){const reveal=r.status!=='rps',me=r.players.find(p=>p.id===data.me),result=r.rpsResult;
 if(changeScreen('rps:'+r.code+':'+(r.round||0))){const wrap=el('div','bi-wrap bi-rps-wrap'),stage=el('section','bi-rps-stage');stage.innerHTML='<div class="bi-rps-heading"><span class="bi-badge">TRƯỚC GIỜ VÀO SÂN</span><h2>Oẳn tù tì</h2><div class="bi-rps-sub" id="bi-rps-rule"></div><span class="bi-rps-timer" id="bi-rps-timer"></span><div class="bi-rps-clock"><i id="bi-rps-progress"></i></div></div><div class="bi-rps-arena"><div class="bi-rps-side bi-rps-mine" id="bi-rps-mine"></div><div class="bi-rps-versus"><span>ĐẤU</span><b>VS</b><span>VÁN '+r.round+'</span></div><div class="bi-rps-side bi-rps-opponents" id="bi-rps-opponents"></div></div><div class="bi-rps-choices"><p id="bi-rps-prompt"></p><div id="bi-rps-buttons"></div></div><div class="bi-rps-result" id="bi-rps-result" hidden></div>';const row=stage.querySelector('#bi-rps-buttons');gestures.forEach((t,i)=>{const b=button('',()=>act('rps',{choice:i}),'bi-rps-choice');b.dataset.choice=i;b.innerHTML=handArt(i)+'<b>'+t+'</b><small>'+(i===0?'Thắng kéo':i===1?'Thắng búa':'Thắng bao')+'</small>';b.setAttribute('aria-label','Chọn '+t);row.append(b);});wrap.append(stage,chatBox());$('bi-content').append(wrap);}
 const stage=$('bi-rps-mine').closest('.bi-rps-stage');stage.classList.toggle('revealed',reveal);$('bi-rps-rule').textContent=r.mode==='line'?'Ai thắng được ưu tiên đi sau':'Ai thắng được ưu tiên bắn trước';const seconds=Math.max(0,Math.ceil(((reveal?r.revealUntil:r.deadline)-r.serverNow)/1000));$('bi-rps-timer').textContent=reveal?'KẾT QUẢ · '+seconds+'s':'CÒN '+seconds+' GIÂY';$('bi-rps-progress').style.width=(Math.max(0,Math.min(1,((reveal?r.revealUntil:r.deadline)-r.serverNow)/(reveal?4600:20000)))*100)+'%';
 const signature=JSON.stringify([reveal,r.players.map(p=>[p.id,p.name,p.choice,p.avatar]),result]);if(stage.dataset.sig!==signature){stage.dataset.sig=signature;const draw=(p,isMine)=>{let c=el('div','bi-rps-contestant'),head=el('div','bi-rps-name',p.name+(isMine?' · Bạn':'')),hand=el('div','bi-rps-hand-wrap'),note=el('div','bi-rps-status');let pick=Number.isInteger(p.choice)?p.choice:null;if(reveal||isMine&&pick!==null){hand.innerHTML=pick===null?'<span class="bi-rps-sealed">?</span>':handArt(pick);note.textContent=pick===null?'Chưa chọn':gestures[pick];}else{hand.classList.add('concealed');hand.innerHTML=handArt(0)+'<span class="bi-rps-sealed">?</span>';note.textContent=p.choice===null?'Đang nghĩ…':'Đã khóa lựa chọn';}if(reveal&&result){let rank=result.order.indexOf(p.id)+1;note.textContent+=(rank?' · Lượt '+rank:'');c.classList.toggle('first',rank===1);}c.append(avatarImg(p.avatar,'bi-rps-avatar'),head,hand,note);return c;};$('bi-rps-mine').replaceChildren(draw(me,true));$('bi-rps-opponents').replaceChildren(...r.players.filter(p=>p.id!==data.me).map(p=>draw(p,false)));$('bi-rps-opponents').classList.toggle('many',r.players.length>2);}
 $('bi-rps-prompt').textContent=reveal?'Đã ngã ngũ! Đang chuẩn bị vào sân…':Number.isInteger(me?.choice)?'Bạn đã chọn '+gestures[me.choice]+' — chờ đối thủ.':'Ra tay nào! Chọn một thế tay.';for(const b of $('bi-rps-buttons').children){b.disabled=reveal||Number.isInteger(me?.choice);b.classList.toggle('selected',+b.dataset.choice===me?.choice);b.setAttribute('aria-pressed',String(+b.dataset.choice===me?.choice));}
 const out=$('bi-rps-result');out.hidden=!reveal;out.setAttribute('aria-live','polite');if(reveal&&result){const order=result.order.map(id=>r.players.find(p=>p.id===id)?.name||'Người chơi'),best=Math.max(...Object.values(result.scores)),mine=result.scores[data.me];const verdict=result.tied?'Đồng điểm · bốc thăm xếp lượt. ':mine===best?'Bạn thắng oẳn tù tì! ':'Đối thủ thắng oẳn tù tì. ';out.textContent=verdict+'Thứ tự vào sân: '+order.join(' → ');}renderChat(r);
}
function ringScore(g,id){
 const shots=g.ringShots[id],total=g.ringStart.length,removed=g.score[id],order='Lượt '+(g.order.indexOf(id)+1)+' · ';
 const result=g.ringResults[id];
 if(result)return result.complete?order+shots+' cú · Hoàn thành '+total+'/'+total:order+'Chưa hoàn thành · '+removed+'/'+total+' bi · '+shots+' cú';
 return order+shots+' cú · '+removed+'/'+total+' bi'+(g.turn!==id?(g.ringPaused?.[id]?' · Chờ thi tiếp':' · Chờ thi'):'');
}
function match(r){
 const bridge=window.__bi3d,matchKey='match:'+r.code+':'+(r.round||0);if(screen.startsWith('match:')&&screen!==matchKey)cleanupMatch();
 if(!bridge?.enter(r,data.me,shot=>act('shot',shot))){
   shell.hidden=false;
   if(changeScreen('preparing:'+r.code)){
     const w=el('div','bi-wrap'),c=card('Đang chuẩn bị sân đất 3D…');c.append(el('p','bi-sub','Đang dựng kính, bóng đổ, ánh sáng tán lá và vật liệu của trò chơi gốc.'));w.append(c);$('bi-content').append(w);
   }
   return;
 }
 if(screen!==matchKey){
   screen=matchKey;$('bi-content').replaceChildren();shell.hidden=true;
   $('app').classList.add('bi-original-match');document.body.classList.add('bi-in-match');
   $('bView').querySelector('.vl-l').textContent=r.mode==='ring'?'Toàn vòng':'Toàn sân';$('bView').querySelector('.vl-s').textContent=r.mode==='ring'?'Vòng':'Sân';
   const panel=el('div');panel.id='bi-match-panel';
   const top=el('div','bi-row'),roomInfo=el('div','bi-grow');roomInfo.append(el('h3','',r.name),el('small','bi-sub','Mã phòng '+r.code));top.append(roomInfo,button('Chân dung',openProfile,'bi-match-profile'),button('Đóng',()=>document.body.classList.remove('bi-mobile-info'),'bi-mobile-close'));
   const status=el('div','bi-online-card');status.append(el('h3','',modeNames[r.mode]));const ruleDetails=el('details');ruleDetails.append(el('summary','','Cách chơi'),BiGuide.list(document,r.mode),button('Xem tất cả chế độ',()=>openModeGuide(r.mode)));status.append(ruleDetails);
   const scores=el('div','bi-list');scores.id='bi-score';const message=el('div','bi-entry');message.id='bi-msg';const rematch=el('div','bi-rematch');rematch.id='bi-rematch';rematch.hidden=true;status.append(scores,message,rematch);
   const precision=el('details');precision.innerHTML='<summary>Ngắm chính xác</summary><div class="bi-precision"><label>Hướng <b id="bi-angle-val">–</b></label><input id="bi-angle" type="range" min="-180" max="180" step=".05" value="-90"><label>Lực <b id="bi-power-val">60%</b></label><input id="bi-power" type="range" min="4" max="100" step=".1" value="60"></div>';
   if(r.mode==='hole'){precision.open=true;const nudge=el('div','bi-nudge');for(const [text,field,delta] of [['−0,1°','dir',-.1],['+0,1°','dir',.1],['−0,2%','power',-.2],['+0,2%','power',.2]]){nudge.append(button(text,()=>{const a=bridge.info().aim;if(field==='dir'){let deg=Math.atan2(a.dz,a.dx)*180/Math.PI+delta;bridge.setDirection(deg*Math.PI/180);}else bridge.setPower(a.power+delta/100);}));}precision.append(nudge,el('p','bi-sub','Điều chỉnh tinh: hướng ±0,1° · lực ±0,2%. Đường ngắm chỉ là hướng ban đầu.'));}
   status.append(precision);
   const opts=el('div','bi-row');opts.append(button('Rời trận',async()=>{if(await ask('Rời trận?','NPC sẽ tiếp quản bi của bạn nếu trận chưa kết thúc.','Rời trận',true))act('leave')},'bi-danger'));if(r.host===data.me)opts.append(button('Hủy phòng',async()=>{if(await ask('Hủy cả phòng?','Tất cả người chơi sẽ trở về sảnh.','Hủy phòng',true))act('cancel')},'bi-danger'));status.append(opts);
   panel.append(top,status,chatBox());document.querySelector('#app .keys').append(panel);
   const bar=document.querySelector('#app .bar'), dock=document.querySelector('#app .dock'), roomBtn=button('Phòng / chat',()=>document.body.classList.toggle('bi-mobile-info'));
   roomBtn.id='bi-room-btn';bar.append(roomBtn);const back=button('Về sảnh',async()=>{if(await ask('Về sảnh?','Bạn sẽ rời phòng hiện tại.','Về sảnh',true))act('leave')});back.id='bi-back';bar.append(back);
   const aim=button(r.mode==='hole'?'Hướng về đích':'Ngắm đích',()=>bridge.aimTarget());aim.id='bi-aim-btn';const shoot=button(r.mode==='petanque'?'Ném bi':'Bắn bi',()=>bridge.fire(),'primary');shoot.id='bi-shot-btn';dock.append(aim,shoot);
   $('bi-power').oninput=()=>{bridge.setPower(+$('bi-power').value/100);$('bi-power-val').textContent=$('bi-power').value+'%'};
   $('bi-angle').oninput=()=>{bridge.setDirection(+$('bi-angle').value*Math.PI/180);$('bi-angle-val').textContent=$('bi-angle').value+'°'};
 }
 shell.hidden=true;const g=r.game,t=bridge.info().turn, isDone=t?.done??(g.phase==='finished'),me=(t?.actor||g.turn)===data.me,actor=t?.actor||g.turn;
 if(isDone)celebrateRoom(r);
 const who=r.players.find(p=>p.id===actor),turn=isDone?(g.teamWinner==='draw'?'Hòa 7–7':g.winner?.includes(data.me)?'🏆 Bạn thắng':'Kết thúc trận'):me?(t?.rolling?'Bạn đang bắn':'Đến lượt bạn'):(who?.name||'Người chơi')+(t?.rolling?' đang bắn':who?.bot?' đang ngắm':' đến lượt');
 const phase=isDone?modeNames[r.mode]:g.phase==='qualify'?'Xếp lượt · 2 m':g.phase==='attack'?'Bắn ăn bi':g.phase==='hole-qualify'?'Xếp lượt vào lỗ':g.phase==='hole'?'Vào lỗ / ăn bi':modeNames[r.mode];
 $('lvlName').textContent=modeNames[r.mode];$('wtitle').textContent=r.name+' · '+r.code;$('goalText').textContent=turn;
 $('goalN').textContent=phase;$('goalSfx').textContent='';$('starLine').textContent='';$('goalBox').classList.toggle('done',isDone||me);$('shots').textContent=r.mode==='ring'?g.ringShots[data.me]:g.shot;$('shotsBox').classList.remove('low');$('shotsBox').querySelector('span').textContent=r.mode==='ring'?'cú của bạn':'lượt bắn';
 $('bi-msg').textContent=t?.rolling?'Đang theo dõi cú bắn của '+(me?'bạn':who?.name||'đối thủ'):g.message;$('bi-shot-btn').disabled=!me||isDone||!!t?.rolling||g.until>r.serverNow||(g.turnDeadline&&g.turnDeadline<=r.serverNow);$('bi-aim-btn').disabled=$('bi-shot-btn').disabled;
 const p=$('bi-score'),scoreKey=[r.rev,g.turnSeq,g.shot,actor,isDone,!!t?.rolling,t?.next,data.me].join(':');
 if(p.dataset.signature!==scoreKey){p.dataset.signature=scoreKey;
 p.replaceChildren();if(g.teams){const teams=el('div','bi-team-score'),mine=g.teams?.[data.me];for(const team of Object.keys(g.teamScore)){const c=el('div','bi-team '+team);c.append(el('b','',('● '+(g.teamLabels?.[team]||(team==='white'?'Trắng':'Đen')))+(team===mine?' · Bạn':'')),el('strong','',(g.teamScore?.[team]||0)+(r.mode==='pool'?' bi':' / '+g.target+' điểm')),el('span','',g.order.filter(id=>g.teams?.[id]===team).map(id=>r.players.find(p=>p.id===id)?.name).join(', ')));teams.append(c)}p.append(teams,el('div','bi-sub',r.mode==='pool'?'Còn '+g.marbles.filter(b=>b.number).length+' bi màu trên sân':r.mode==='petanque'?'Hiệp '+g.end+' · '+(g.nearest?'Gần nhất: '+g.nearest.d.toFixed(1)+' cm':'Chưa ném bi'):('Yêu cầu '+g.requiredBands+' băng · '+(g.lastContacts??0)+'/2 bi · '+(g.lastBands??0)+' băng cú trước')))}for(const x of (r.mode==='ring'?g.order.map(id=>r.players.find(p=>p.id===id)).filter(Boolean):r.players)){
   const b=g.marbles.find(b=>b.owner===x.id),row=el('div','bi-player '+(actor===x.id&&!isDone?'bi-turn':'')),dot=el('span','bi-dot');dot.style.background=colors[g.playerKinds?.[x.id]??b?.kind??g.order.indexOf(x.id)%8];
   const name=el('div','bi-grow',x.name+(x.id===data.me?' (Bạn)':''));name.append(el('div','bi-sub',(actor===x.id&&!isDone?(t?.rolling?'Đang bắn · ':'Đến lượt · '):t?.next===x.id?'Lượt kế · ':'')+(g.teams?('Phe '+(g.teamLabels?.[g.teams[x.id]]||(g.teams[x.id]==='white'?'trắng':'đen'))+' · '+(r.mode==='petanque'?(g.remaining?.[x.id]??0)+' bi còn lại':g.score[x.id]+(r.mode==='pool'?' bi':' điểm'))):r.mode==='ring'?ringScore(g,x.id):!b&&!t?.rolling?'Bi đã bị ăn':`${g.score[x.id]} bi ăn được${r.mode==='hole'?(g.entered[x.id]?' · Đã vào lỗ':' · Chưa vào lỗ'):''}`)));row.append(avatarImg(x.avatar,'bi-match-avatar'),dot,name);p.append(row);
 }}
 const rematch=$('bi-rematch');rematch.hidden=!isDone;const rematchKey=[r.round,r.host,data.me,isDone].join(':');if(isDone&&rematch.dataset.key!==rematchKey){rematch.dataset.key=rematchKey;rematch.replaceChildren();const win=g.winner?.includes(data.me);rematch.append(el('div','bi-result-mark',win?'🏆':'↻'),el('b','',win?'Bạn thắng ván này!':'Ván '+(r.round||1)+' đã kết thúc'),el('p','bi-sub','Giữ nguyên phòng '+r.code+' và người chơi.'));if(r.host===data.me){const mode=selectMode('bi-next-mode',r.mode);const actions=el('div','bi-rematch-actions');actions.append(button('Chơi lại ngay',()=>act('rematch',{mode:mode.value}),'primary'),button('Đổi chế độ / về phòng chờ',()=>act('reopen',{mode:mode.value})));rematch.append(mode,actions);}else rematch.append(button('Yêu cầu chơi lại',async()=>{if(await act('request-rematch'))toast('Đã gửi yêu cầu tới chủ phòng.')},'primary'),el('p','bi-sub','Chủ phòng có thể chọn chế độ khác cho ván tiếp.'));}
 const info=bridge.info();if(info&&document.activeElement!==$('bi-angle')&&document.activeElement!==$('bi-power')){$('bi-angle').value=Math.atan2(info.aim.dz,info.aim.dx)*180/Math.PI;$('bi-angle-val').textContent=(+$('bi-angle').value).toFixed(2)+'°';$('bi-power').value=(info.aim.power*100).toFixed(1);$('bi-power-val').textContent=$('bi-power').value+'%';}
 renderChat(r);
}
function render(){if(!active){syncMusic();return;}if(!data?.room)lobby();else{const r=data.room;if(r.status==='waiting')waiting(r);else if(r.status==='rps'||(r.game?.shot===0&&r.rpsResult&&r.revealUntil>r.serverNow))rps(r);else if(r.game)match(r);}syncMusic();}
// Once per finished round; the winner comes from the authoritative game state, not the local shooter.
let celebrationKey='',victoryLayer=null,victoryAudio=null,victoryTimer=null,duckedVolume=null,soloCelebration=false;
function dismissVictory(){soloCelebration=false;if(victoryLayer){victoryLayer.remove();victoryLayer=null;}clearTimeout(victoryTimer);if(victoryAudio){victoryAudio.pause();victoryAudio=null;}if(duckedVolume!==null){audio.volume=duckedVolume;duckedVolume=null;}}
async function replayRoom(code,round){const r=data?.room;if(!r||r.code!==code||r.round!==round||r.game?.phase!=='finished'){dismissVictory();return false;}if(r.host===data.me)return act('rematch',{mode:r.mode});const ok=await act('request-rematch');if(ok)toast('Đã gửi yêu cầu chơi lại tới chủ phòng.');return ok;}
function replayButton(onReplay){const b=button('Chơi lại',async()=>{if(b.disabled)return;b.disabled=true;try{if(await onReplay()){dismissVictory();return;}}catch(e){toast(e.message||'Không thể chơi lại.');}b.disabled=false;},'bi-victory-close');return b;}
function showVictory(key,names,subtitle,draw=false,onReplay=()=>{dismissVictory();return true},effectsOnly=false){
 if(celebrationKey===key)return;
 dismissVictory();celebrationKey=key;soloCelebration=effectsOnly;
 const layer=victoryLayer=el('section',effectsOnly?'bi-victory-layer bi-solo-celebration':'bi-victory-layer');
 if(effectsOnly)layer.setAttribute('aria-hidden','true');
 else {
   layer.setAttribute('role','status');layer.setAttribute('aria-live','polite');
   const box=el('div','bi-victory-card'),crown=el('div','bi-victory-crown',draw?'◆':'🏆');
   box.append(crown,el('div','bi-victory-kicker',draw?'VÁN ĐẤU KẾT THÚC':'MỪNG CHIẾN THẮNG'),el('h2','',draw?'Hòa cuộc!':names),el('p','',draw?subtitle:subtitle||'Người chiến thắng'),replayButton(onReplay),button('Đóng',dismissVictory,'bi-victory-dismiss'));
   layer.append(box);
 }
 if(!draw&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const confetti=el('div','bi-confetti'),palette=['#e3ae43','#9c392d','#24816b','#f5db91','#ee784b','#5798d1'];
   for(let i=0;i<100;i++){const p=el('i');p.style.setProperty('--x',Math.random()*100+'%');p.style.setProperty('--drift',(Math.random()-.5)*68+'vw');p.style.setProperty('--delay',Math.random()*2.5+'s');p.style.setProperty('--speed',3.2+Math.random()*3.2+'s');p.style.setProperty('--spin',(Math.random()-.5)*1800+'deg');p.style.background=palette[i%palette.length];confetti.append(p);}
   layer.prepend(confetti);
 }
 document.body.append(layer);
 if(!draw){
   victoryAudio=new Audio('./flag-victory-cheer.mp3');victoryAudio.volume=.65;
   if(!audio.paused){duckedVolume=audio.volume;audio.volume*=.25;}
   victoryAudio.onended=()=>{if(duckedVolume!==null){audio.volume=duckedVolume;duckedVolume=null;}};
   victoryAudio.play().catch(()=>{if(duckedVolume!==null){audio.volume=duckedVolume;duckedVolume=null;}});
 }
 victoryTimer=setTimeout(()=>{if(victoryLayer!==layer)return;if(effectsOnly)dismissVictory();else layer.querySelector('.bi-confetti')?.remove();},8500);
}
function celebrateRoom(r){const g=r.game,winners=(g.winner||[]).map(id=>r.players.find(p=>p.id===id)?.name).filter(Boolean),draw=g.teamWinner==='draw'||!winners.length;showVictory(r.code+':'+r.round,winners.join(' · '),draw?g.message:'THẮNG VÁN '+r.round+' · '+(g.teamWinner&&g.teamLabels?.[g.teamWinner]?'Phe '+g.teamLabels[g.teamWinner]+' · ':'')+(g.message||modeNames[r.mode]),draw,()=>replayRoom(r.code,r.round));}
// Solo has its own rating and next-level dialog. Add only the celebration
// effects, leaving its original controls visible and fully interactive.
let soloVictorySerial=0;
window.addEventListener('bi-solo-victory',()=>showVictory('solo:'+(++soloVictorySerial),'','',false,undefined,true));
window.addEventListener('bi-solo-celebration-end',()=>{if(soloCelebration)dismissVictory();});
// Arcalune's official downloadable Free BGM catalog. Sunlit Capital is the
// opening track (0:00) of the requested YouTube compilation.
const lobbyMusicSlot=$('bi-lobby-music-slot');
const music=el('section');
music.id='bi-music';music.hidden=true;
music.setAttribute('role','group');music.setAttribute('aria-label','Điều khiển nhạc nền');
music.innerHTML='<button id="bi-music-pause" aria-label="Phát nhạc" title="Phát nhạc" aria-pressed="false">▶</button><label class="bi-volume-label" for="bi-volume"><span aria-hidden="true">♫</span><input id="bi-volume" type="range" min="0" max="100" value="25" aria-label="Âm lượng" title="Âm lượng"></label>';
$('bi-game-music-slot').append(music);
const audio=new Audio();
audio.preload='metadata';audio.volume=.25;
const rpsAudio=new Audio();rpsAudio.preload='auto';rpsAudio.loop=true;rpsAudio.volume=.25;
const tracks=[
 ['jrpg-13-first-village','Where It All Began'],
 ['jrpg-53-lakeside-town','Mirror on the Water'],
 ['jrpg-15-harbour-town','Rope and Salt'],
 ['arc-48-childhood','A Field We Used to Cross'],
 ['jrpg-51-hidden-village','The Village That Isn’t on Maps'],
 ['days-of-youth','Days of Youth'],
 ['windswept-highlands','Windswept Highlands'],
 ['hilltop-breeze','Hilltop Breeze']
];
const areaTracks={solo:[3,5,0],lobby:[0,7,4],waiting:[4,0,1],ring:[5,3,7],line:[6,5,3],hole:[4,1,7],pool:[1,5,2],carom:[7,4,1],carom1:[1,7,0],carom3:[6,1,7],petanque:[2,6,3]};
const rpsTrack='https://dl.arcalune.com/sunlit-capital.wav';
let musicArea='',trackIndex=0,musicUnlocked=false,musicWanted=true;
try{musicWanted=localStorage.getItem('bi-music-enabled')!=='off'}catch{}
function isRpsArea(){
 const r=active&&data?.room;
 return !!r&&(r.status==='rps'||(r.game?.shot===0&&r.rpsResult&&r.revealUntil>r.serverNow));
}
function currentMusicArea(){
 if(isRpsArea())return 'rps';
 if(!active)return 'solo';
 const r=data?.room;
 return !r?'lobby':r.status==='waiting'?'waiting':r.mode||'lobby';
}
function saveMusicWanted(v){musicWanted=v;try{localStorage.setItem('bi-music-enabled',v?'on':'off')}catch{}}
function showMusicBar(){music.hidden=false;document.body.classList.add('bi-music-open');}
function mountMusic(){const slot=active&&!shell.hidden?lobbyMusicSlot:$('bi-game-music-slot');if(music.parentElement!==slot)slot.append(music);}
function currentAudio(){return musicArea==='rps'?rpsAudio:audio;}
function preloadRpsMusic(){if(!rpsAudio.src)rpsAudio.src=rpsTrack;}
function startRpsMusic(){if(!musicWanted||!musicUnlocked)return;preloadRpsMusic();rpsAudio.play().catch(()=>{});}
function playAreaTrack(){
 if(musicArea==='rps')return;
 const playlist=areaTracks[musicArea]||areaTracks.solo;
 const item=tracks[playlist[trackIndex%playlist.length]];
 audio.src='https://dl.arcalune.com/'+item[0]+'.wav';
 if(musicWanted&&musicUnlocked)audio.play().catch(()=>{});
}
function audioState(){
 const playing=!currentAudio().paused;
 $('bi-music-pause').textContent=playing?'Ⅱ':'▶';
 const label=playing?'Tạm dừng nhạc':'Phát nhạc';
 $('bi-music-pause').setAttribute('aria-label',label);
 $('bi-music-pause').setAttribute('aria-pressed',String(playing));
 $('bi-music-pause').title=label;
}
function syncMusic(){
 mountMusic();
 const area=currentMusicArea();
 if(area!==musicArea){
   audio.pause();rpsAudio.pause();musicArea=area;trackIndex=0;
   const inRps=area==='rps';
   if(inRps){
     rpsAudio.currentTime=0;
     startRpsMusic();
   }else if(musicUnlocked||!music.hidden)playAreaTrack();
 }
 audioState();syncCoastSound();
}
function openMusic(){
 musicUnlocked=true;saveMusicWanted(true);showMusicBar();preloadRpsMusic();syncMusic();
 if(musicArea==='rps')startRpsMusic();else if(!audio.src)playAreaTrack();else audio.play().catch(()=>{});
 audioState();
}
function unlockMusic(){
 if(musicUnlocked)return;
 musicUnlocked=true;
 if(musicWanted)openMusic();
}
musicOpen.onclick=$('bi-music-top').onclick=openMusic;
$('bi-music-pause').onclick=()=>{
 const player=currentAudio();
 if(player.paused){saveMusicWanted(true);if(musicArea==='rps')startRpsMusic();else if(!audio.src)playAreaTrack();else audio.play().catch(()=>{});}
 else{saveMusicWanted(false);player.pause();}
 audioState();
};
$('bi-volume').oninput=()=>audio.volume=rpsAudio.volume=+$('bi-volume').value/100;
audio.addEventListener('ended',()=>{if(musicArea!=='rps'){trackIndex++;playAreaTrack();}});
for(const player of [audio,rpsAudio]){
 player.addEventListener('error',()=>{if(player===currentAudio()&&musicWanted)audioState();});
 player.addEventListener('play',audioState);player.addEventListener('pause',audioState);
}
document.addEventListener('pointerdown',unlockMusic,{once:true,passive:true});
document.addEventListener('keydown',unlockMusic,{once:true});
// Tidewater CC0 coastal field recordings, independent of optional background music.
const surfAudio=new Audio('./surf_far.ogg'),palmAudio=new Audio('./palms.ogg');surfAudio.loop=palmAudio.loop=true;surfAudio.volume=.20;palmAudio.volume=.075;surfAudio.preload=palmAudio.preload='metadata';
let coastSound=true,coastUnlocked=false;try{coastSound=localStorage.getItem('bi-coast-sound')!=='off'&&localStorage.getItem('aali.sound')!=='false'}catch{}
const coastButton=button('🌊 Sóng biển',()=>{coastSound=!coastSound;try{localStorage.setItem('bi-coast-sound',coastSound?'on':'off')}catch{}coastUnlocked=true;syncCoastSound()});coastButton.id='bi-beach-sound';document.querySelector('#app .bar').append(coastButton);
function syncCoastSound(){coastButton.textContent=coastSound?'🌊 Sóng biển':'🌊 Bật sóng';coastButton.setAttribute('aria-pressed',String(coastSound));if(coastSound&&coastUnlocked&&!document.hidden&&!isRpsArea()&&(!active||screen.startsWith('match:'))){for(const a of [surfAudio,palmAudio])if(a.paused)a.play().catch(()=>{});}else{surfAudio.pause();palmAudio.pause();}}
function unlockCoast(){coastUnlocked=true;syncCoastSound();}document.addEventListener('pointerdown',unlockCoast,{once:true,passive:true});document.addEventListener('keydown',unlockCoast,{once:true});document.addEventListener('visibilitychange',syncCoastSound);window.addEventListener('bi-sound-setting',e=>{coastSound=!!e.detail;syncCoastSound()});syncCoastSound();
syncMusic();
if(invite)open();
// The first screen is the original 3D game with a modeled coastal setting. 
})();
