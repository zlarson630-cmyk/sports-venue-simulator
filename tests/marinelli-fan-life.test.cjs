const {test}=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");

test("Marinelli fans take real steps, watch from the rail, and return to their own seats",()=>{
  let seed=43;
  const g=game(undefined,()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),
    {marinelliTest:true,record:false});
  g.element("openMarinelliGrandstand").click();
  const needs=g.element("fanNeedsRate");
  needs.value="0";needs.oninput();
  const duration=g.element("gameMinutes");
  duration.value="1";duration.onchange();
  g.api.startFanTest();
  const crowd=g.api.fanState().fans;
  assert.equal(crowd.length,100);
  g.api.advanceFans(2);
  assert.ok(crowd.some(fan=>fan.walkDistance>0&&Math.abs(Math.hypot(fan.walkDx,fan.walkDy)-1)<1e-8));

  let viewingFan;
  for(let i=0;i<120&&!viewingFan;i++){
    g.api.advanceFans(0.4);
    viewingFan=crowd.find(fan=>fan.activity==="watching from concourse");
  }
  assert.ok(viewingFan,"a fan should stop and watch from the rail during the game");
  assert.ok(crowd.some(fan=>fan.cheerUntil>0),"fans should visibly react to a game moment");
  assert.equal(g.api.guestAction(viewingFan),"Watching from the rail");
  assert.ok(viewingFan.feet>=5);
  const distanceAtRail=viewingFan.walkDistance;
  g.api.advanceFans(0.4);
  assert.equal(viewingFan.walkDistance,distanceAtRail);
  for(let i=0;i<75&&!viewingFan.seated;i++)g.api.advanceFans(0.25);
  assert.ok(viewingFan.seated);
  assert.equal(viewingFan.x,viewingFan.seatTarget.x);
  assert.equal(viewingFan.y,viewingFan.seatTarget.y);
  assert.ok(viewingFan.walkDistance>distanceAtRail);
  for(let i=0;i<115&&g.api.fanState().fanActive;i++)g.api.advanceFans(1);
  assert.ok(crowd.every(fan=>fan.exited));
});
