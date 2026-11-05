const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
const height=(g,h)=>g.element('placementHeight').onchange({target:{value:String(h)}});
const underneath=(g,on)=>g.element('workUnder').onchange({target:{checked:on}});
const saved=(base,hollow=true)=>({version:2,fieldRevision:7,entranceRevision:1,money:500000,tiles:{'12,8':{type:'stand',rot:0,baseFeet:base,hollow}},edges:{}});

test('new raised seating opens underneath; lower shops persist, undo and remove independently',()=>{
 const g=game();g.select('stand');height(g,15);g.clickTile(12,8);
 assert.equal(g.api.state().tiles['12,8'].hollow,true);assert.equal(g.api.state().tiles['12,8'].baseFeet,15);
 underneath(g,true);g.select('concession');g.clickTile(12,8);
 assert.equal(g.api.underlaysState()['12,8']?.type,'concession',g.element('toast').textContent);
 assert.equal(g.api.state().tiles['12,8'].type,'stand');assert.equal(g.api.state().money,500000-1800-2500);
 const loaded=game(JSON.parse(g.storage.get('svs01')));assert.equal(loaded.api.underlaysState()['12,8'].type,'concession');assert.equal(loaded.api.state().tiles['12,8'].hollow,true);
 g.select('erase');g.clickTile(12,8);assert.equal(g.api.underlaysState()['12,8'],undefined);assert.ok(g.api.state().tiles['12,8']);
 g.element('undo').click();assert.equal(g.api.underlaysState()['12,8'].type,'concession');
 underneath(g,false);g.select('foundation');g.clickTile(12,8);assert.equal(g.api.state().tiles['12,8'].hollow,true);assert.match(g.element('toast').textContent,/Remove the pieces below/);
 g.select('erase');g.clickTile(12,8);assert.equal(g.api.state().tiles['12,8'],undefined);assert.equal(g.api.underlaysState()['12,8'].type,'concession');
 g.element('undo').click();assert.equal(g.api.state().tiles['12,8'].type,'stand');assert.equal(g.api.underlaysState()['12,8'].type,'concession');
});

test('underside clearance uses actual elevation and solid legacy foundations stay solid',()=>{
 for(const [base,type,allowed] of [[5,'path',false],[10,'path',true],[10,'concession',true],[15,'restroom',true],[15,'tree',false],[25,'tree',true]]){
  const g=game(saved(base));underneath(g,true);g.select(type);g.clickTile(12,8);
  assert.equal(!!g.api.underlaysState()['12,8'],allowed,`${base} ft ${type}: ${g.element('toast').textContent}`);
 }
 const legacy=saved(15);delete legacy.tiles['12,8'].hollow;const g=game(legacy);assert.equal(g.api.state().tiles['12,8'].hollow,undefined);
 underneath(g,true);g.select('restroom');g.clickTile(12,8);assert.equal(g.api.underlaysState()['12,8'],undefined);
 underneath(g,false);g.select('foundation');g.clickTile(12,8);assert.equal(g.api.state().tiles['12,8'].hollow,true);
 const ground=game(saved(0,false));ground.select('foundation');ground.clickTile(12,8);assert.equal(ground.api.state().tiles['12,8'].hollow,false);
});

test('raised pieces can be built over existing ground pieces only when their volumes clear',()=>{
 const g=game();g.select('path');g.clickTile(12,8);g.select('concourse');height(g,15);g.clickTile(12,8);
 assert.equal(g.api.state().tiles['12,8'].type,'concourse');assert.equal(g.api.underlaysState()['12,8'].type,'path');
 const invalid=saved(10);invalid.tiles['12,8'].type='concourse';invalid.underlays={'12,8':{type:'restroom',rot:0}};
 assert.throws(()=>g.api.validatePark(invalid),/open space|conflicts/);
 const valid=saved(15);valid.underlays={'12,8':{type:'restroom',rot:0}};assert.equal(g.api.validatePark(valid).underlays['12,8'].type,'restroom');
});

test('covered paths keep ground access separate from upper nodes and fans use amenities below seating',()=>{
 const fs=require('node:fs'),p=JSON.parse(fs.readFileSync(new URL('./fixtures/two-level-wedge-v038.json',`file://${__filename}`),'utf8'));
 p.underlays={};p.gameMinutes=2;
 for(const k of ['10,5','11,5']){p.underlays[k]=p.tiles[k];p.tiles[k]={type:'concourse',rot:0,baseFeet:15,hollow:true};}
 for(const [k,type] of [['10,4','restroom'],['11,4','concession']]){p.tiles[k]={type:'stand',rot:0,baseFeet:15,hollow:true};p.underlays[k]={type,rot:0};}
 let seed=43;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const g=game(p,random),sections=g.api.reachableSeats();assert.ok(sections.length);assert.ok(sections.every(s=>s.key!=='10,4'&&s.key!=='11,4'));
 assert.ok(sections.some(s=>s.slots.some(slot=>slot.route.some(n=>n.node==='g:10,5'))));
 assert.ok(sections.every(s=>s.slots.every(slot=>!slot.route.some(n=>n.node==='c:10,5'))));
 g.api.startFanTest();const crowd=g.api.fanState().fans;assert.equal(crowd.length,100);let food=false,bathroom=false;
 for(let t=0;t<300&&g.api.fanState().fanActive;t++){g.api.advanceFans(1);food ||=crowd.some(f=>f.foodVisits>0);bathroom ||=crowd.some(f=>f.bathroomVisits>0);for(const f of crowd)assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.y));}
 assert.ok(food);assert.ok(bathroom);assert.ok(crowd.every(f=>f.exited));
});

test('hollow diagonal footprints clear adjacent lower pieces and hiding upper layers preserves the save',()=>{
 const p=saved(15);p.tiles['12,8']={type:'backstopStand',rot:1,baseFeet:15,hollow:true,shift:-0.5};
 const g=game(p,()=>0.5,{cacheCanvas:true});underneath(g,true);g.select('path');g.clickTile(11,7);
 assert.equal(g.api.underlaysState()['11,7']?.type,'path',g.element('toast').textContent);
 const state=g.storage.get('svs01'),before=g.api.renderStats().worldBuilds;underneath(g,false);g.api.draw();
 assert.ok(g.api.renderStats().worldBuilds>before);assert.equal(g.storage.get('svs01'),state);
 const bad=JSON.parse(state);bad.tiles['12,8'].hollow=false;assert.throws(()=>g.api.validatePark(bad),/open space|conflicts|overlaps/);
});

test('fans climb to upper seats and independently reach food and bathrooms below those same sections',()=>{
 const p=require('./fixtures/hollow-stands-v043.json');
 let seed=147;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const g=game(p,random),sections=g.api.reachableSeats();assert.equal(sections.reduce((n,s)=>n+s.capacity,0),48);
 g.api.startFanTest();const crowd=g.api.fanState().fans;assert.equal(crowd.length,48);let food=false,bathroom=false,lower=false;
 for(let t=0;t<300&&g.api.fanState().fanActive;t++){
  g.api.advanceFans(1);food ||=crowd.some(f=>f.foodVisits>0&&f.seated);bathroom ||=crowd.some(f=>f.bathroomVisits>0&&f.seated);
  lower ||=crowd.some(f=>['to concession','to restroom','returning to seat'].includes(f.activity)&&f.feet===0);
  for(const f of crowd)if(f.seated)assert.ok(f.feet>=16.25);
 }
 assert.ok(food);assert.ok(bathroom);assert.ok(lower);assert.ok(crowd.every(f=>f.exited));
});
