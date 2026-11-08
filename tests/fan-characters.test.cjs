const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");

test("characters have stable per-fan clothing, headwear and silhouettes",()=>{
  const {api}=game();
  const one=api.fanAppearance(2,4);
  assert.deepEqual({...one},{...api.fanAppearance(2,4)});
  assert.notEqual(one.shirt,api.fanAppearance(3,4).shirt);
  assert.equal(typeof one.hat,"boolean");
  assert.equal(typeof one.jersey,"boolean");
});
test("walking stride advances only on actual movement",()=>{
  const {api}=game();
  const fan={...api.fanAppearance(0,0),x:10,y:10,spawned:true,activity:"arriving",seated:false};
  const before=fan.stride;
  api.advanceFanAppearance(fan,10,10);
  assert.equal(fan.stride,before);
  fan.x=10.2;
  api.advanceFanAppearance(fan,10,10);
  assert.ok(fan.stride>before);
  assert.equal(api.fanWalking(fan),true);
  fan.seated=true;
  assert.equal(api.fanWalking(fan),false);
});
test("visual state does not mutate game movement or purchase values",()=>{
  const {api}=game();
  const fan={...api.fanAppearance(0,0),x:10,y:10,feet:0,hunger:80,bathroomNeed:20,paid:true,spawned:true,activity:"arriving"};
  const original={x:fan.x,y:fan.y,hunger:fan.hunger,bathroomNeed:fan.bathroomNeed,paid:fan.paid};
  fan.x=10.3;
  api.advanceFanAppearance(fan,10,10);
  assert.deepEqual({x:10,y:fan.y,hunger:fan.hunger,bathroomNeed:fan.bathroomNeed,paid:fan.paid},original);
});
