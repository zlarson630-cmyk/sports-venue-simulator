const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');
const random=seed=>()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);

// Test the live party planner, not the legacy standalone arrivalSchedule helper.
test('actual game arrivals have party waves, singles and variable gaps',()=>{
 const patterns=[];
 for(const seed of [42,99]) {
  const g=game(undefined,random(seed),{record:false});g.api.buildConcourseDemo();g.api.startFanTest();
  const fans=g.api.fanState().fans;assert.equal(fans.length,100);
  const parties=new Map();
  for(const fan of fans){if(!parties.has(fan.partyId))parties.set(fan.partyId,[]);parties.get(fan.partyId).push(fan);}
  assert.ok([...parties.values()].some(p=>p.length===1));assert.ok([...parties.values()].some(p=>p.length>1));
  for(const party of parties.values())for(let i=1;i<party.length;i++)assert.ok(party[i].start-party[i-1].start<=0.101);
  const gaps=fans.slice(1).map((f,i)=>f.start-fans[i].start);
  assert.ok(gaps.every(n=>n>0));assert.ok(gaps.some(n=>n>0.2));
  patterns.push(fans.map(f=>f.start));
 }
 assert.notDeepEqual(patterns[0],patterns[1]);
});

test('short selected games and repeated saved-park games drain all 100 fans without extra tickets',()=>{
 const initial=game(undefined,random(27),{record:false});initial.api.buildConcourseDemo();
 const saved=JSON.parse(initial.storage.get('svs01'));
 for(const minutes of [1,2]) {
  const g=game(saved,random(27),{record:false});
  g.element('gameMinutes').value=String(minutes);g.element('gameMinutes').onchange();
  const geometry=JSON.stringify(g.api.state().tiles),balance=g.api.state().money,patterns=[];
  for(let cycle=0;cycle<2;cycle++) {
   g.api.startFanTest();const fans=g.api.fanState().fans;assert.equal(fans.length,100);
   patterns.push(fans.map(f=>f.start));
   g.api.advanceFans(minutes*60);assert.ok(g.api.fanState().fanActive,'clock end does not discard fans');
   for(let step=0;step<60&&g.api.fanState().fanActive;step++)g.api.advanceFans(5);
   assert.equal(g.api.fanState().fanActive,false);assert.ok(fans.every(f=>f.exited&&f.paid));
   assert.ok(new Set(fans.map(f=>f.exitStart)).size>1);
   for(const fan of fans){assert.equal(fan.x,g.api.parkingSpawn.x);assert.equal(fan.y,g.api.parkingSpawn.y);assert.equal(fan.feet,0);}
   assert.equal(g.api.state().money,balance+500*(cycle+1));
   assert.equal(JSON.stringify(g.api.state().tiles),geometry);
  }
  assert.notDeepEqual(patterns[0],patterns[1]);
  const reload=game(JSON.parse(g.storage.get('svs01')),random(1),{record:false});
  assert.equal(reload.api.state().money,balance+1000);assert.equal(JSON.stringify(reload.api.state().tiles),geometry);
 }
});
