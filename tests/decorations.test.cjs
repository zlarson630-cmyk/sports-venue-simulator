const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');

test('one-tile decorations rotate, save, reload, remove with refund and undo',()=>{
 for(const [type,cost] of [['tree',250],['baseballStatue',1500]]){
  const g=game(),before=g.api.state().money;g.select(type);g.key('r');g.clickTile(12,8);
  assert.equal(g.api.state().tiles['12,8'].type,type);assert.equal(g.api.state().tiles['12,8'].rot,1);
  assert.equal(g.api.state().money,before-cost);assert.equal(g.api.seatCapacity({type}),0);
  assert.equal(g.api.footprint(12,8,{type,rot:1}).length,4);
  const saved=JSON.parse(g.storage.get('svs01')),reloaded=game(saved);assert.equal(reloaded.api.state().tiles['12,8'].type,type);
  g.select('path');g.clickTile(12,8);assert.equal(g.api.state().tiles['12,8'].type,type);
  g.select('erase');g.clickTile(12,8);assert.equal(g.api.state().tiles['12,8'],undefined);assert.equal(g.api.state().money,before-cost+Math.round(cost*0.7));
  g.element('undo').click();assert.equal(g.api.state().tiles['12,8'].type,type);assert.equal(g.api.state().money,before-cost);
 }
});

test('decorations block occupied ground and cannot be placed in the protected playing field',()=>{
 for(const type of ['tree','baseballStatue']){
  const g=game({version:2,fieldRevision:7,entranceRevision:1,money:90000,tiles:{'8,4':{type,rot:0}},edges:{}});
  assert.equal(g.api.solidBuildingAt(8.5,4.5),true);assert.equal(g.api.approachRoute(),null);
  g.select(type);const cash=g.api.state().money;g.clickTile(18,14);assert.equal(g.api.state().tiles['18,14'],undefined);assert.equal(g.api.state().money,cash);
 }
});

test('decoration art renders finite geometry for all eight facings and four camera views',()=>{
 const g=game();
 for(let camera=0;camera<4;camera++){
  for(const type of ['tree','baseballStatue'])for(let rot=0;rot<8;rot++)g.api.drawObject(12,8,{type,rot});
  for(const command of g.commands)for(const value of command.slice(1))if(typeof value==='number')assert.ok(Number.isFinite(value));
  g.key('q');
 }
});
