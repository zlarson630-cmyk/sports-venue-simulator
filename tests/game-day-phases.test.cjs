const test=require("node:test");
const assert=require("node:assert/strict");
const {game}=require("./helpers/game.cjs");
test("pregame occupies first 20 percent and innings evenly fill the rest",()=>{
  const g=game();
  const phase=g.api.gameDayStage;
  assert.equal(phase(0,300).label,"PREGAME");
  assert.equal(phase(59.9,300).label,"PREGAME");
  assert.equal(phase(60,300).label,"INNING 1");
  assert.equal(phase(60+240/9,300).label,"INNING 2");
  assert.equal(phase(299.9,300).label,"INNING 9");
  assert.equal(phase(300,300).label,"FINAL");
});
test("phase timing scales to two minute events",()=>{
  const g=game();
  const phase=g.api.gameDayStage;
  assert.equal(phase(23.9,120).kind,"pregame");
  assert.equal(phase(24,120).inning,1);
  assert.equal(phase(120,120).kind,"final");
});
