/* One guide for the lobby, every match and the single-player help sheet. */
(function(root){
'use strict';
const modes={
 solo:{name:'Chơi đơn · vượt màn',short:'Bắn bi ra khỏi vòng phấn để hoàn thành mục tiêu của mỗi màn.',steps:[
  'Kéo ngược bi cái rồi thả để bắn; kéo xa hơn thì lực mạnh hơn. Dùng mũi tên để dịch vị trí bi cái ở các màn có giới hạn cung.',
  'Đẩy bi mục tiêu ra khỏi vòng phấn. Bi dừng trên vạch vẫn tính là trong vòng.',
  'Hoàn thành mục tiêu trước khi hết lượt. Dùng ít lượt bắn để đạt nhiều sao hơn và mở màn tiếp theo.'
 ]},
 ring:{name:'Bắn bi vòng tròn · chơi mạng',short:'Mỗi người lần lượt dọn sạch cùng một vòng bi. Ai dùng ít cú bắn nhất thắng.',steps:[
  'Oẳn tù tì để xếp thứ tự thi. Người thắng đi trước, người thua đi sau.',
  'Mỗi người có cùng số bi và cùng thế bi ban đầu. Bắn tất cả bi mục tiêu ra khỏi vòng. Bi còn trên vạch chưa được tính.',
  'Mọi cú bắn đều được tính, kể cả cú hụt. Tiếp tục bắn cho đến khi dọn sạch vòng. Bi cái giữ vị trí trong vòng; ra ngoài thì trở về điểm xuất phát.',
  'Sau phần thi của mỗi người, sân được xếp lại đúng thế bi ban đầu cho người tiếp theo.',
  'Khi mọi người đã thi xong, người dọn sạch vòng bằng ít cú nhất thắng. Bằng số cú thì đồng hạng.'
 ]},
 line:{name:'Bắn bi hai vạch',short:'Bắn gần vạch đích để được ưu tiên, sau đó bắn loại đối thủ.',steps:[
  'Oẳn tù tì: người thắng được ưu tiên đi sau trong lượt xếp hạng.',
  'Mỗi người bắn một lần từ vạch xuất phát về vạch đích cách 2 m; bi dừng gần vạch đích nhất được đi trước.',
  'Ở giai đoạn đối kháng, bắn trúng bi đối thủ để loại bi đó. Trúng được bắn tiếp; hụt thì đổi lượt.',
  'Người cuối cùng còn bi trên sân thắng ván.'
 ]},
 hole:{name:'Bắn bi vào lỗ',short:'Vào lỗ trước để có quyền ăn bi đối thủ. Căn lực và hướng gió.',steps:[
  'Oẳn tù tì, mỗi người bắn một lần hướng về lỗ. Bi đã vào lỗ được ưu tiên, sau đó đến bi gần lỗ nhất.',
  'Muốn ăn bi, trước tiên phải đưa bi của mình rơi vào lỗ. Bi vào lỗ được đặt lại gần miệng lỗ.',
  'Căn hướng và lực vừa phải: bi đi quá nhanh có thể vượt qua miệng lỗ. Quan sát chỉ báo gió vì gió thay đổi sau từng cú bắn. Bi chạm gò cát tròn quanh sân sẽ bật trở lại.',
  'Khi đã có quyền ăn bi, bắn trúng đối thủ để loại người đó và được bắn tiếp. Hụt thì đổi lượt. Người cuối cùng còn bi thắng.'
 ]},
 pool:{name:'Bắn bi sáu lỗ · trắng / đen',short:'Hai phe dùng bi cái riêng, ăn 14 bi màu vào sáu lỗ để tính điểm.',steps:[
  'Phe trắng dùng bi cái trắng, phe đen dùng bi cái đen. Oẳn tù tì để xếp lượt.',
  'Dùng bi cái của phe mình bắn 14 bi màu có số vào bất kỳ lỗ nào; mọi màu đều tính điểm cho phe đang bắn.',
  'Ăn được bi hợp lệ thì bắn tiếp; hụt hoặc chạm bi cái đối phương trước thì đổi phe. Bi cái trắng hoặc đen rơi lỗ được đặt lại và chuyển lượt.',
  'Khi hết 14 bi màu, phe có nhiều điểm hơn thắng. Nếu mỗi phe ăn 7 bi thì hòa. Không cần bắn bi cái vào lỗ để kết thúc.'
 ]},
 carom:{name:'Bida Carom · tự do',short:'Bi cái chạm được cả hai bi còn lại trong một cú để ghi 1 điểm.',steps:[
  'Phe trắng và phe vàng có bi cái riêng; bi đỏ là mục tiêu chung. Sân không có lỗ, gò cát quanh sân làm băng.',
  'Bắn bi cái của phe mình chạm cả hai bi còn lại trong cùng một cú. Không bắt buộc phải dội băng.',
  'Mỗi cú hợp lệ ghi 1 điểm và được bắn tiếp; không ghi điểm thì đổi phe.',
  'Phe đạt 10 điểm trước thắng.'
 ]},
 carom1:{name:'Bida Carom · 1 băng',short:'Chạm hai bi còn lại và dội tối thiểu 1 băng trước bi mục tiêu thứ hai.',steps:[
  'Phe trắng và phe vàng dùng bi cái riêng; bi đỏ là mục tiêu chung. Gò cát là băng.',
  'Trong một cú bắn, bi cái phải chạm cả hai bi còn lại, đồng thời dội ít nhất 1 băng trước khi chạm bi mục tiêu thứ hai.',
  'Đạt yêu cầu: 1 điểm và bắn tiếp. Không đạt: chuyển phe.',
  'Phe đạt 10 điểm trước thắng.'
 ]},
 carom3:{name:'Bida Carom · 3 băng',short:'Chạm cả hai bi mục tiêu và dội tối thiểu 3 băng trước lần chạm bi thứ hai.',steps:[
  'Chọn đúng bi cái của phe trắng hoặc vàng; bi đỏ là mục tiêu chung. Dùng gò cát để đổi hướng bi.',
  'Bi cái phải chạm cả hai bi còn lại trong cùng một cú; trước lần chạm bi mục tiêu thứ hai phải dội tối thiểu 3 băng.',
  'Cú đủ điều kiện ghi 1 điểm và được bắn tiếp. Nếu thiếu băng hoặc hụt bi mục tiêu thì đổi phe.',
  'Phe đạt 10 điểm trước thắng.'
 ]},
 petanque:{name:'Bi sắt · Pétanque',short:'Ném bi sắt thật gần bi đích; phe đạt 13 điểm thắng.',steps:[
  'Hai phe xanh và đỏ ném bi sắt về bi đích nhỏ. Chơi đơn hoặc đôi có 3 bi mỗi người; đội ba người có 2 bi mỗi người.',
  'Căn hướng và lực để bi bay theo cung rồi lăn tới gần bi đích. Có thể ném trúng để đẩy bi đối thủ; bi sắt ra ngoài sân không tính.',
  'Phe có bi xa bi đích hơn tiếp tục ném. Nếu đã hết bi, phe còn bi ném hết số còn lại.',
  'Cuối mỗi hiệp, phe có bi gần đích nhất ghi số điểm bằng số bi của phe đó nằm gần hơn viên tốt nhất bên kia. Phe đạt 13 điểm thắng trận.'
 ]}
};
const AUTHOR='Andy N Le',ZALO='0868231181',DONATE='Donate cho tác giả ly cà phê nha !';
function node(doc,tag,cls,text){const n=doc.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function get(mode){return modes[mode]||modes.solo;}
function list(doc,mode){const ul=node(doc,'ul','bi-guide-steps');get(mode).steps.forEach(t=>ul.appendChild(node(doc,'li','',t)));if(mode!=='solo')ul.appendChild(node(doc,'li','','Mỗi lượt có 120 giây kể từ khi được quyền chơi. Hết giờ sẽ chuyển lượt.'+(mode==='ring'?' Giữ nguyên thế bi và số cú để thi tiếp khi đến lượt; nếu tất cả người còn lại đã hoàn thành, phần thi hết giờ kết thúc.':mode==='petanque'?' Lượt ném hết giờ tính là một bi không hợp lệ.':'')));return ul;}
function author(doc){const a=node(doc,'div','bi-guide-author'),z=node(doc,'a','',ZALO);z.href='https://zalo.me/'+ZALO;z.target='_blank';z.rel='noopener noreferrer';const p=node(doc,'p','','Zalo: ');p.appendChild(z);a.append(node(doc,'h3','','Tác giả: '+AUTHOR),p,node(doc,'p','bi-guide-donate',DONATE));return a;}
function render(doc,root,selected='solo'){root.replaceChildren();root.appendChild(node(doc,'p','bi-guide-intro','Chọn chế độ bên dưới để xem cách chơi, cách tính điểm và điều kiện thắng. Kéo bi về sau rồi thả; dùng thanh lực, đường ngắm và nút Toàn sân để quan sát khi cần.'));for(const [id,m] of Object.entries(modes)){const d=node(doc,'details','bi-guide-mode');d.dataset.mode=id;d.open=id===selected;d.append(node(doc,'summary','',m.name),list(doc,id));root.appendChild(d);}root.appendChild(author(doc));}
const api={modes,get,list,render,author,AUTHOR,ZALO,DONATE};if(typeof module==='object'&&module.exports)module.exports=api;else root.BiGuide=api;
})(typeof globalThis!=='undefined'?globalThis:this);
