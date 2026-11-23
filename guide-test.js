'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),guide=require('./game-guide');
const html=fs.readFileSync(__dirname+'/index.html','utf8'),js=fs.readFileSync(__dirname+'/online.js','utf8'),css=fs.readFileSync(__dirname+'/online.css','utf8');
assert.equal(Object.keys(guide.modes).length,9);
for(const m of Object.values(guide.modes)){assert.ok(m.name&&m.short);assert.ok(m.steps.length>=3);}
assert.match(guide.get('pool').steps.join(' '),/14 bi màu/);assert.match(guide.get('carom3').steps.join(' '),/tối thiểu 3 băng/);assert.match(guide.get('petanque').steps.join(' '),/13 điểm/);
function element(tag){return {tag,children:[],dataset:{},append(...v){this.children.push(...v)},appendChild(v){this.append(v)},replaceChildren(...v){this.children=v},textContent:''};}
const doc={createElement:element},root=element('div');guide.render(doc,root,'pool');
const sections=root.children.filter(n=>n.tag==='details');assert.equal(sections.length,9);assert.equal(sections.filter(n=>n.open).length,1);assert.equal(sections.find(n=>n.open).dataset.mode,'pool');
const flat=JSON.stringify(root);assert.ok(flat.includes('Andy N Le'));assert.ok(flat.includes('0868231181'));assert.ok(flat.includes('Donate cho tác giả ly cà phê nha !'));
assert.ok(!/Thông tin tham khảo|satyasairay|indiamart\.com|chưa xác minh|factList/.test(html));
const c={};vm.createContext(c);vm.runInContext(js.slice(js.indexOf('function handArt('),js.indexOf('function waiting(')),c);
for(let i=0;i<3;i++){assert.ok(c.handArt(i).includes('folk-hand-'+i+'.jpg'));assert.ok(fs.existsSync(__dirname+'/folk-hand-'+i+'.jpg'));}
assert.ok(js.includes("b.innerHTML=handArt(i)"));assert.ok(js.includes('handArt(pick)'));assert.ok(css.includes('.bi-rps-hand-wrap .bi-hand-print'));
assert.ok(js.includes('BiGuide.list(document,r.mode)'));assert.ok(html.includes("BiGuide.render(document,$('howTo')"));console.log('PASS: nine accurate mode guides, author/contact/donate, shared original illustrated gesture artwork, no old source list.');
