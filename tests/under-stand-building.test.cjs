const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
const park=(type='stand',baseFeet=15,hollow=true)=>({version:2,fieldRevision:7,entranceRevision:1,money:500000,tiles:{'12,8':{type,rot:0,baseFeet,hollow}},edges:{}});
const under=(g,on)=>g.element('workUnder').onchange({target:{checked:on}});

test('work-under renders faint geometry, excludes ghost occluders and leaves the park unchanged',()=>{
 const g=game(park('concourse',15,false),()=>0.5,{cacheCanvas:true});g.select('inspectFan');
 const save=JSON.stringify(g.api.state()),fan={x:12.5,y:8.5,feet:0,standSeat:true};
 const normal=g.api.occlusionCuts(fan).length;assert.ok(normal>0,'solid upper foundation occludes a ground fan normally');
 const builds=g.api.renderStats().worldBuilds;under(g,true);
 assert.ok(g.commands.some(c=>c[0]==='style'&&c[1]==='globalAlpha'&&c[2]===0.14));
 assert.equal(g.api.occlusionCuts(fan).length,0,'ghost upper foundations do not hide ground fans');
 assert.equal(JSON.stringify(g.api.state()),save);assert.ok(g.api.renderStats().worldBuilds>builds);
 const ghostBuilds=g.api.renderStats().worldBuilds;g.api.draw();assert.equal(g.api.renderStats().worldBuilds,ghostBuilds);
 under(g,false);assert.equal(g.api.occlusionCuts(fan).length,normal);
});

test('shop previews report usable clearance and agree with actual placement',()=>{
 for(const [type,base,hollow,allowed,reason] of [
  ['stand',10,true,true,/10.1 ft clear.*10 ft needed.*Fits/],
  ['concourse',10,true,false,/9.5 ft clear.*10 ft needed/],
  ['stand',5,true,false,/5.1 ft clear.*10 ft needed/],
  ['stand',15,false,false,/Solid foundation.*Open underneath/],
 ]){
  const g=game(park(type,base,hollow));under(g,true);g.select('concession');
  g.api.setHover(12,8);g.api.draw();assert.match(g.element('standHelp').textContent,reason);
  const before=g.api.state().money;g.clickTile(12,8);
  assert.equal(!!g.api.underlaysState()['12,8'],allowed);
  assert.equal(g.api.state().money,before-(allowed?2500:0));
 }
});

test('support columns leave walkways clear and do not change footprints or seat access',()=>{
 const p=park();const g=game(p),item=g.api.state().tiles['12,8'];
 assert.equal(g.api.supportColumns(12,8,item).length,4);
 const original=JSON.stringify(g.api.footprint(12,8,item));
 under(g,true);g.select('path');g.clickTile(12,8);
 assert.equal(g.api.supportColumns(12,8,item).length,0,'no post stands on a paved approach');
 assert.equal(JSON.stringify(g.api.footprint(12,8,item)),original);
 assert.equal(g.api.seatCapacity(item),20);
 const loaded=game(JSON.parse(g.storage.get('svs01')));assert.equal(loaded.api.underlaysState()['12,8'].type,'path');
 for(let camera=0;camera<4;camera++){g.api.draw();g.key('q');}
 for(const c of g.commands)for(const n of c.slice(1))if(typeof n==='number')assert.ok(Number.isFinite(n));
});

test('storefront names remain on clipped wall planes at every facing and camera',()=>{
 const g=game();const labels={concession:'FOOD',drinks:'DRINKS',iceCream:'ICE CREAM',souvenir:'GEAR',restroom:'RESTROOMS'};
 for(let camera=0;camera<4;camera++){
  for(const [type,label] of Object.entries(labels))for(let rot=0;rot<8;rot++){
   g.commands.length=0;g.api.drawObject(12,8,{type,rot});
   assert.ok(g.commands.some(c=>c[0]==='fillText'&&c[1]===label),`${type}/${rot}/${camera}`);
   assert.ok(g.commands.some(c=>c[0]==='transform'));
   assert.ok(g.commands.some(c=>c[0]==='clip'));
   for(const c of g.commands)for(const n of c.slice(1))if(typeof n==='number')assert.ok(Number.isFinite(n));
  }
  g.key('q');
 }
});
