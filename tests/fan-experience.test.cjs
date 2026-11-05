const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./helpers/game.cjs');

for(const restroom of [false,true])test(`early ${restroom?'restroom':'food'} stops and scenic pauses do not stall 100 fans`,()=>{
  const park=structuredClone(require('./fixtures/two-level-wedge-v038.json'));
  if(restroom)park.tiles['8,6']={type:'restroom',rot:6};
  park.tiles['8,7']={type:'concession',rot:6};
  park.gameMinutes=2;
  let seed=43;
  const g=game(park,()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),{record:false});
  g.api.startFanTest();
  const crowd=g.api.fanState().fans;
  assert.equal(crowd.length,100);
  // Keep the fan at the back of the shared corridor free to take in the view.
  for(const fan of crowd.filter(f=>f.scenicCandidate)){fan.bathroomNeed=0;fan.hunger=0;}
  let sawPause=false;
  for(let second=0;second<260&&g.api.fanState().fanActive;second++){
    g.api.advanceFans(1);
    sawPause ||= crowd.some(f=>f.activity==='taking in the view');
  }
  assert.ok(sawPause);
  assert.ok(crowd.some(f=>f.arrivalStop&&(restroom?f.bathroomVisits:f.foodVisits)>0));
  assert.ok(crowd.every(f=>f.exited));
  assert.match(g.element('fanHappinessValue').textContent,/^\d+%$/);
  assert.match(g.element('fanHappinessReason').textContent,/^Final/);
});

test('a fan in the middle of a full row leaves at 75% and returns to the same seat',()=>{
  const g=game(require('./fixtures/hollow-stands-v043.json'),()=>0.5,{record:false});
  const slider=g.element('fanNeedsRate');
  slider.value='0';
  slider.oninput();
  g.api.startFanTest();
  const crowd=g.api.fanState().fans;
  const before=crowd[4].bathroomNeed;
  g.api.advanceFans(35);
  assert.equal(crowd[4].bathroomNeed,before);
  assert.ok(crowd.every(f=>f.seated&&!f.arrivalStop));
  const row=crowd.filter(f=>f.sectionKey==='13,11'&&f.row===1).sort((a,b)=>a.col-b.col);
  assert.equal(row.length,5);
  const fan=row[2],seat=fan.seat;
  for(const guest of crowd){guest.bathroomNeed=0;guest.hunger=0;}
  fan.bathroomNeed=75;
  slider.value='0.25';
  slider.oninput();
  g.api.advanceFans(25);
  assert.equal(fan.bathroomVisits,1);
  assert.equal(fan.seat,seat);
  assert.equal(fan.x,fan.seatTarget.x);
  assert.equal(fan.y,fan.seatTarget.y);
  assert.ok(row.every(f=>f.seated));
});
